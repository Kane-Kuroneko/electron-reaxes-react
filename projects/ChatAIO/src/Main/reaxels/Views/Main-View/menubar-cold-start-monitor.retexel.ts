/**
 * MenubarColdStartMonitor — 冷启动观测器（只写 JSONL / verdict）。
 *
 * 不参与 Phase 5 门闩：菜单项 layout 由 `menu-view:visual-ready` 放行。
 * 不 capturePage、不 remount、不是 present / loadURL 的前置条件。
 * 日志：unpackaged 写 cwd/logs/menubar-cold-start.jsonl；packaged 写 userData/logs。
 * 设计：docs/features/menubar-cold-start-monitor.md
 */

const SHELL_WC_EVENTS = [
	'did-start-loading' ,
	'dom-ready' ,
	'did-finish-load' ,
	'did-fail-load' ,
] as const;

const CONTENT_WC_EVENTS = [ 'did-start-loading' ] as const;

export class MenubarColdStartMonitor {
	private enabled = true;
	private sessionId = '';
	private startedAt = 0;
	private events : MenubarBootLogEvent[] = [];
	private seq = 0;
	private logStream : fs.WriteStream | null = null;
	private logPath = '';
	private snapshotTimer : ReturnType<typeof setInterval> | null = null;
	private watchTimer : ReturnType<typeof setTimeout> | null = null;
	private sealed = false;
	private mainWindowRef : BrowserWindow | null = null;
	private viewIdByWebContents = new WeakMap<object , string>();

	beginBoot() : void {
		if( !this.enabled || this.sessionId ) {
			return;
		}
		this.startedAt = Date.now();
		this.sessionId = `boot-${ this.startedAt.toString( 36 ) }`;
		this.initLogStream();
		this.flush( {
			ts : this.startedAt ,
			type : 'boot-meta' ,
			sessionId : this.sessionId ,
			detail : {
				platform : process.platform ,
				packaged : this.isPackaged() ,
				electron : process.versions.electron ,
				pid : process.pid ,
			} ,
		} );
		this.note( 'boot-start' );
	}

	note( name : MenubarBootMilestone , detail? : Record<string , unknown> ) : void {
		if( !this.enabled || this.sealed ) {
			return;
		}
		this.flush( {
			ts : Date.now() ,
			hrt : this.hrt() ,
			type : 'milestone' ,
			proc : 'main' ,
			name ,
			sessionId : this.sessionId ,
			detail ,
		} );
		if( name === 'renderer-visual-ready' || name === 'phase-5-content-views-start' ) {
			this.maybeSealSoon();
		}
	}

	noteRendererProbe( payload : MenubarBootProbePayload ) : void {
		if( !this.enabled || this.sealed || !payload?.milestone ) {
			return;
		}
		this.flush( {
			ts : payload.ts || Date.now() ,
			hrt : payload.hrt ,
			type : 'milestone' ,
			proc : 'renderer' ,
			name : payload.milestone ,
			sessionId : this.sessionId ,
			detail : payload.detail ,
		} );
		if( payload.milestone === 'renderer-visual-ready' ) {
			this.maybeSealSoon();
		}
	}

	instrumentMainWindow( win : BrowserWindow ) : void {
		if( !this.enabled || !win || win.isDestroyed() ) {
			return;
		}
		this.beginBoot();
		this.mainWindowRef = win;
		this.note( 'phase-2-window-created' , {
			visible : safeCall( () => win.isVisible() ) ,
			minimized : safeCall( () => win.isMinimized() ) ,
			backgroundColor : safeCall( () => win.getBackgroundColor() ) ,
			contentBounds : safeCall( () => win.getContentBounds() ) ,
			showDefaultsTrue : true ,
		} );
		win.once( 'show' , () => {
			this.note( 'window-show' , {
				visible : true ,
				contentBounds : safeCall( () => win.getContentBounds() ) ,
			} );
		} );
		win.once( 'ready-to-show' , () => {
			this.note( 'window-ready-to-show' , {
				visible : safeCall( () => win.isVisible() ) ,
			} );
		} );
		if( win.isVisible() ) {
			this.note( 'window-show' , {
				alreadyVisible : true ,
				contentBounds : safeCall( () => win.getContentBounds() ) ,
			} );
		}
		this.bindWcEvents( win.webContents , 'menubar' , 'menubar-shell' , SHELL_WC_EVENTS );
		this.startWatch();
	}

	instrumentContentView(
		view : WebContentsView ,
		meta : { viewId : string; kind : string },
	) : void {
		if( !this.enabled || this.sealed || !isWebContentsViewAlive( view ) ) {
			return;
		}
		this.viewIdByWebContents.set( view.webContents , meta.viewId );
		this.note( 'wcv-created' , {
			viewId : meta.viewId ,
			kind : meta.kind ,
			visible : safeCall( () => view.getVisible() ) ,
			bounds : safeCall( () => view.getBounds() ) ,
		} );
		this.bindWcEvents( view.webContents , 'wcv' , meta.viewId , CONTENT_WC_EVENTS );
	}

	noteWcvLoadAttempt( view : WebContentsView , url : string , context : string ) : void {
		if( !this.enabled || this.sealed ) {
			return;
		}
		const viewId = this.viewIdByWebContents.get( view.webContents ) || '';
		this.note( 'wcv-load-attempt' , {
			viewId ,
			url ,
			context ,
			visible : isWebContentsViewAlive( view ) ? safeCall( () => view.getVisible() ) : null ,
			bounds : isWebContentsViewAlive( view ) ? safeCall( () => view.getBounds() ) : null ,
			isLoading : isWebContentsViewAlive( view )
				? safeCall( () => view.webContents.isLoading() )
				: null ,
		} );
	}

	noteClip( win : BrowserWindow ) : void {
		if( !this.enabled || this.sealed ) {
			return;
		}
		const shell = findMainShellWebContentsView( win );
		const bounds = shell ? safeCall( () => shell.getBounds() ) : null;
		const menuBarHeight = getMenuBarHeight();
		this.note( 'clip-applied' , {
			ok : Boolean( shell ) ,
			bounds ,
			menuBarHeight ,
			shellHeightIsMenuBar : bounds ? bounds.height === menuBarHeight : null ,
		} );
	}

	notePresent( viewId : string , bounds : { x : number; y : number; width : number; height : number } | null ) : void {
		if( !this.enabled || this.sealed ) {
			return;
		}
		const menuBarHeight = getMenuBarHeight();
		this.note( 'wcv-present' , {
			viewId ,
			bounds ,
			coversMenubar : Boolean( bounds && bounds.y < menuBarHeight - 1 ) ,
		} );
	}

	private bindWcEvents(
		webContents : Electron.WebContents ,
		target : MenubarBootWcTarget ,
		viewId : string ,
		eventNames : readonly string[],
	) : void {
		if( !webContents || webContents.isDestroyed() ) {
			return;
		}
		for( const eventName of eventNames ) {
			webContents.on( eventName as any , ( ...args : unknown[] ) => {
				if( this.sealed ) {
					return;
				}
				const extra = eventName === 'did-fail-load'
					? { errorCode : args[1] , errorDescription : args[2] , url : args[3] }
					: {};
				this.flush( {
					ts : Date.now() ,
					hrt : this.hrt() ,
					type : 'wc-event' ,
					proc : 'main' ,
					name : eventName ,
					target ,
					viewId ,
					sessionId : this.sessionId ,
					detail : {
						url : safeCall( () => webContents.getURL() ) ,
						isLoading : safeCall( () => webContents.isLoading() ) ,
						osPid : safeCall( () => webContents.getOSProcessId() ) ,
						...extra ,
					} ,
				} );
			} );
		}
	}

	private startWatch() : void {
		if( this.snapshotTimer || this.sealed ) {
			return;
		}
		this.snapshotTimer = setInterval( () => {
			this.takeSnapshot();
		} , MENUBAR_BOOT_SNAPSHOT_INTERVAL_MS );
		this.watchTimer = setTimeout( () => {
			this.seal( 'watch-cap' );
		} , MENUBAR_BOOT_WATCH_CAP_MS );
	}

	private maybeSealSoon() : void {
		if( this.sealed ) {
			return;
		}
		const hasVisual = this.events.some( event => event.name === 'renderer-visual-ready' );
		const hasPhase5 = this.events.some( event => event.name === 'phase-5-content-views-start' );
		const elapsed = Date.now() - this.startedAt;
		if( hasVisual && ( hasPhase5 || elapsed > MENUBAR_BOOT_WATCH_MS ) ) {
			setTimeout( () => this.seal( 'visual-and-phase5' ) , 800 );
			return;
		}
		if( elapsed >= MENUBAR_BOOT_WATCH_MS && hasVisual ) {
			this.seal( 'watch-window' );
		}
	}

	private takeSnapshot() : void {
		if( this.sealed ) {
			return;
		}
		const win = this.mainWindowRef;
		const menuBarHeight = getMenuBarHeight();
		const layers = probeLayers( win , menuBarHeight , ( wc ) => {
			return this.viewIdByWebContents.get( wc ) || '';
		} );
		const shell = win ? findMainShellWebContentsView( win ) : null;
		const shellBounds = shell ? safeCall( () => shell.getBounds() ) : null;
		const menubarWc = win && !win.isDestroyed() ? win.webContents : null;
		const visibleContent = layers.find( layer => {
			return layer.role === 'content' && layer.visible === true;
		} );
		const loadingWcvCount = layers.filter( layer => {
			return layer.role === 'content' && layer.isLoading === true;
		} ).length;
		const menubarLoading = menubarWc && !menubarWc.isDestroyed()
			? safeCall( () => menubarWc.isLoading() )
			: null;
		const snapshot : MenubarBootSnapshot = {
			windowVisible : win && !win.isDestroyed() ? safeCall( () => win.isVisible() ) : null ,
			windowBg : win && !win.isDestroyed() ? safeCall( () => win.getBackgroundColor() ) : null ,
			menubarLoading ,
			menubarUrl : menubarWc && !menubarWc.isDestroyed() ? safeCall( () => menubarWc.getURL() ) : null ,
			menubarOsPid : menubarWc && !menubarWc.isDestroyed()
				? safeCall( () => menubarWc.getOSProcessId() )
				: null ,
			shellBounds ,
			shellHeightIsMenuBar : shellBounds ? shellBounds.height === menuBarHeight : null ,
			visibleWcvId : visibleContent?.viewId || '' ,
			visibleWcvLoading : visibleContent?.isLoading ?? null ,
			visibleWcvUrl : visibleContent?.url ?? null ,
			visibleWcvBounds : visibleContent?.bounds ?? null ,
			visibleWcvCoversMenubar : visibleContent?.coversMenubar === true ,
			loadingWcvCount ,
			contentChildCount : layers.filter( layer => layer.role === 'content' ).length ,
			overlapLoading : menubarLoading === true && loadingWcvCount > 0 ,
			layers : [] ,
		};
		this.flush( {
			ts : Date.now() ,
			hrt : this.hrt() ,
			type : 'snapshot' ,
			proc : 'main' ,
			sessionId : this.sessionId ,
			seq : this.seq ,
			snapshot ,
		} );
	}

	seal( reason : string ) : void {
		if( !this.enabled || this.sealed ) {
			return;
		}
		this.sealed = true;
		if( this.snapshotTimer ) {
			clearInterval( this.snapshotTimer );
			this.snapshotTimer = null;
		}
		if( this.watchTimer ) {
			clearTimeout( this.watchTimer );
			this.watchTimer = null;
		}
		this.takeSnapshot();
		const verdict = computeMenubarColdStartVerdict( this.events );
		this.flush( {
			ts : Date.now() ,
			type : 'verdict' ,
			sessionId : this.sessionId ,
			detail : {
				reason ,
				...verdict ,
			} ,
		} );
		console.info(
			`[MenubarColdStart] ${ verdict.severity } suspects=${ verdict.suspects.join( ',' ) || 'none' }`
			+ ` showToVisualMs=${ verdict.deltas.showToVisualMs }`
			+ ` overlap=${ verdict.deltas.overlapLoadingMs }ms`
			+ ` → ${ this.logPath }`,
		);
		console.info( `[MenubarColdStart] ${ verdict.hint }` );
		if( this.logStream ) {
			try {
				this.logStream.end();
			} catch { /* 静默 */ }
			this.logStream = null;
		}
	}

	private flush( record : MenubarBootLogEvent ) : void {
		this.seq += 1;
		const line = {
			...record ,
			seq : record.seq ?? this.seq ,
			sessionId : record.sessionId || this.sessionId ,
		};
		this.events.push( line );
		if( !this.logStream ) {
			this.initLogStream();
		}
		if( !this.logStream ) {
			return;
		}
		try {
			this.logStream.write( JSON.stringify( line ) + '\n' );
		} catch { /* 静默 */ }
	}

	private initLogStream() : void {
		if( this.logStream ) {
			return;
		}
		try {
			const logDir = this.resolveLogDir();
			if( !fs.existsSync( logDir ) ) {
				fs.mkdirSync( logDir , { recursive : true } );
			}
			this.logPath = path.join( logDir , 'menubar-cold-start.jsonl' );
			this.rotateIfNeeded( this.logPath );
			this.logStream = fs.createWriteStream( this.logPath , { flags : 'a' } );
			console.info( `[MenubarColdStart] jsonl → ${ this.logPath }` );
		} catch ( error ) {
			console.warn( '[MenubarColdStart] Failed to init log stream:' , error );
		}
	}

	private resolveLogDir() : string {
		if( this.isPackaged() ) {
			try {
				return path.join( app.getPath( 'userData' ) , 'logs' );
			} catch { /* fall through */ }
		}
		return path.join( process.cwd() , 'logs' );
	}

	private rotateIfNeeded( logPath : string ) : void {
		try {
			if( !fs.existsSync( logPath ) ) {
				return;
			}
			if( fs.statSync( logPath ).size < 8 * 1024 * 1024 ) {
				return;
			}
			const rotated = `${ logPath }.1`;
			if( fs.existsSync( rotated ) ) {
				fs.unlinkSync( rotated );
			}
			fs.renameSync( logPath , rotated );
		} catch { /* 静默 */ }
	}

	private isPackaged() : boolean {
		try {
			return app.isPackaged;
		} catch {
			return false;
		}
	}

	private hrt() : number {
		try {
			return performance.now();
		} catch {
			return Date.now() - this.startedAt;
		}
	}
}

function safeCall<T>( fn : () => T ) : T | null {
	try {
		return fn();
	} catch {
		return null;
	}
}

function findMainShellWebContentsView( win : BrowserWindow | null | undefined ) : WebContentsView | null {
	if( !win || win.isDestroyed() ) {
		return null;
	}
	const match = ( view : View ) : WebContentsView | null => {
		if( view instanceof WebContentsView && view.webContents === win.webContents ) {
			return view;
		}
		for( const child of view.children ) {
			const found = match( child );
			if( found ) {
				return found;
			}
		}
		return null;
	};
	const fromContent = match( win.contentView );
	if( fromContent ) {
		return fromContent;
	}
	const parent = ( win.contentView as View & { parent? : View } ).parent;
	if( parent ) {
		return match( parent );
	}
	return null;
}

function probeLayers(
	win : BrowserWindow | null | undefined ,
	menuBarHeight : number ,
	getViewId : ( wc : object ) => string,
) : MenubarBootLayerProbe[] {
	if( !win || win.isDestroyed() ) {
		return [];
	}
	const layers : MenubarBootLayerProbe[] = [];
	const visit = ( view : View , index : number ) => {
		const isWcv = view instanceof WebContentsView;
		const isShell = isWcv && view.webContents === win.webContents;
		let bounds : MenubarBootLayerProbe['bounds'] = null;
		let visible : boolean | null = null;
		let isLoading : boolean | null = null;
		let url : string | null = null;
		let osPid : number | null = null;
		let viewId = '';
		try {
			bounds = view.getBounds();
		} catch { /* ignore */ }
		try {
			visible = typeof ( view as WebContentsView ).getVisible === 'function'
				? ( view as WebContentsView ).getVisible()
				: null;
		} catch { /* ignore */ }
		if( isWcv ) {
			viewId = isShell ? 'menubar-shell' : ( getViewId( view.webContents ) || '' );
			if( !view.webContents.isDestroyed() ) {
				isLoading = safeCall( () => view.webContents.isLoading() );
				url = safeCall( () => view.webContents.getURL() );
				osPid = safeCall( () => view.webContents.getOSProcessId() );
			}
		}
		const coversMenubar = !isShell
			&& visible === true
			&& Boolean( bounds && bounds.y < menuBarHeight - 1 && bounds.height > 0 && bounds.width > 0 );
		layers.push( {
			index ,
			kind : isWcv ? 'web-contents-view' : 'view' ,
			role : isShell ? 'menubar-shell' : ( isWcv ? 'content' : 'unknown' ) ,
			viewId ,
			visible ,
			bounds ,
			isLoading ,
			url ,
			osPid ,
			coversMenubar ,
		} );
		try {
			view.children.forEach( ( child , childIndex ) => visit( child , childIndex ) );
		} catch { /* ignore */ }
	};
	try {
		const parent = ( win.contentView as View & { parent? : View } ).parent;
		const root = parent || win.contentView;
		root.children.forEach( ( child , index ) => visit( child , index ) );
		if( layers.length === 0 ) {
			visit( win.contentView , 0 );
		}
	} catch { /* ignore */ }
	return layers;
}

let globalMonitor : MenubarColdStartMonitor | null = null;

export function getMenubarColdStartMonitor() : MenubarColdStartMonitor {
	if( !globalMonitor ) {
		globalMonitor = new MenubarColdStartMonitor();
	}
	return globalMonitor;
}


import type { MenubarBootLayerProbe , MenubarBootLogEvent , MenubarBootMilestone , MenubarBootProbePayload , MenubarBootSnapshot , MenubarBootWcTarget } from '#shared/menubar-cold-start-monitor';
import {
	computeMenubarColdStartVerdict ,
	MENUBAR_BOOT_SNAPSHOT_INTERVAL_MS ,
	MENUBAR_BOOT_WATCH_CAP_MS ,
	MENUBAR_BOOT_WATCH_MS,
} from '#shared/menubar-cold-start-monitor';
import { getMenuBarHeight } from '#shared/menubar-geometry';
import { isWebContentsViewAlive } from '#main/services/web-contents-view-alive.utility';
import { app , type BrowserWindow , type View , WebContentsView } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
