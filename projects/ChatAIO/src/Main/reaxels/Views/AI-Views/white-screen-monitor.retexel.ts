/**
 * @description WhiteScreenMonitor Retexel — currentAIView 调度链追踪器
 *
 * 生产与开发一律启用（静态导入进 main bundle）。日志：
 *   userData/logs/white-screen-monitor.jsonl
 *
 * 设计约束（对齐用户要求）：
 * 1. 默认无副作用：不 capturePage / 不 remount / 不踢绘。
 *    capturePage 会踢 compositor 产帧，掩盖真问题。
 * 2. 面向 agent：追踪 view 调度链（focus/show/restore → hierarchy 决策 →
 *    mount/detach/bounds/focus），用 chainId+seq 串起时间线，便于排查根因。
 * 3. 少侵入：业务侧只在调度入口 begin/note/end；不在业务路径散落采帧探针。
 * 4. 窗口生命周期探针：同步记录 window/contentBounds/view bounds，用于确认
 *    最大化最小化时 WCV 没有被写成 1×1。默认不 capturePage、不踢绘。
 */

import {
	app ,
	type BrowserWindow ,
	type Rectangle ,
	type View ,
	type WebContentsView ,
} from 'electron';
import { isWebContentsViewAlive , isWebContentsViewDead } from '#main/services/web-contents-view-alive.utility';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type ViewScheduleTrigger =
	| 'focus'
	| 'show'
	| 'restore'
	| 'blur'
	| 'hide'
	| 'minimize'
	| 'present-switch'
	| 'present-recover'
	| 'apply-visibility'
	| 'imperative-switch'
	| 'cold-start'
	| 'manual'
	| 'orphan';

export type ViewScheduleOp =
	| 'window-focus'
	| 'window-show'
	| 'window-restore'
	| 'window-blur'
	| 'window-hide'
	| 'window-minimize'
	| 'window-lifecycle'
	| 'soft-recover'
	| 'recover-after-focus'
	| 'present'
	| 'mount-switch'
	| 'mount-recover'
	| 'detach'
	| 'set-bounds'
	| 'set-visible'
	| 'restore-focus'
	| 'hierarchy-check'
	| 'apply-visibility'
	| 'instrument-view'
	| 'note';

export type ViewSchedulePhase =
	| 'enter'
	| 'decision'
	| 'action'
	| 'exit'
	| 'bg'
	| 'meta';

export interface ViewHierarchySnapshot {
	viewId: string;
	attached: boolean;
	visible: boolean;
	bounds: Rectangle | null;
	prevBounds?: Rectangle | null;
	mainFocused: boolean;
	mainVisible: boolean;
	mainMinimized: boolean;
	webContentsFocused: boolean;
	isLoading: boolean;
	ready: boolean;
	destroyed: boolean;
	url: string;
	settingsOpened: boolean;
	childrenCount?: number;
	/** Electron webContents.visibilityState（只读，无 executeJavaScript） */
	visibilityState?: string;
	/** webContents.getBackgroundThrottling() */
	backgroundThrottling?: boolean;
	/** BrowserWindow.getBackgroundColor() */
	windowBackgroundColor?: string;
	/** view 自身底色（若 API 可用） */
	viewBackgroundColor?: string;
}

/** 窗口生命周期同步探针（事件回调里立刻采样，不走 setImmediate） */
export interface WindowStateProbe {
	focused: boolean;
	visible: boolean;
	minimized: boolean;
	maximized: boolean;
	destroyed: boolean;
	opacity: number | null;
	backgroundColor: string | null;
	bounds: Rectangle | null;
	contentBounds: Rectangle | null;
	childrenCount: number;
}

/** contentView 子层只读清单（定位「露哪一层底色」） */
export interface LayerChildProbe {
	index: number;
	kind: 'web-contents-view' | 'view' | 'unknown';
	viewId: string;
	visible: boolean | null;
	bounds: Rectangle | null;
	backgroundColor: string | null;
	backgroundThrottling: boolean | null;
	visibilityState: string | null;
	webContentsFocused: boolean | null;
	isLoading: boolean | null;
	url: string | null;
}

export interface WhiteScreenMonitorConfig {
	/** 生产/开发一律默认 true；显式关才停 */
	enabled: boolean;
	logDir: string;
	logFileName: string;
	/** 超过该字节则轮转到 .1；0 不轮转 */
	maxLogBytes: number;
	/** 同链最大事件数，防 resize 风暴撑爆 */
	maxEventsPerChain: number;
	/** 无显式 end 时，超过该毫秒自动封链 */
	chainTtlMs: number;
	/** 是否写入 bounds 未变化的 skip（开发开，生产关） */
	logBoundsSkipped: boolean;
	/** 是否写入薄堆栈（开发默认 true，生产 false） */
	includeStack: boolean;
	/** 生命周期事件写图层清单（可能略增日志量） */
	logLayerProbe: boolean;
}

const DEV_CONFIG: WhiteScreenMonitorConfig = {
	enabled: true ,
	logDir: 'logs' ,
	logFileName: 'white-screen-monitor.jsonl' ,
	maxLogBytes: 20 * 1024 * 1024 ,
	maxEventsPerChain: 120 ,
	chainTtlMs: 8_000 ,
	logBoundsSkipped: true ,
	includeStack: true ,
	logLayerProbe: true ,
};

const PROD_CONFIG: WhiteScreenMonitorConfig = {
	...DEV_CONFIG ,
	logBoundsSkipped: false ,
	includeStack: false ,
	logLayerProbe: false ,
};

export function resolveWhiteScreenMonitorConfig(
	overrides?: Partial<WhiteScreenMonitorConfig>,
): WhiteScreenMonitorConfig {
	const packaged = (() => {
		try {
			return app.isPackaged;
		} catch {
			return false;
		}
	})();
	const base = packaged ? PROD_CONFIG : DEV_CONFIG;
	return {
		...base ,
		...( overrides || {} ) ,
		enabled: overrides?.enabled ?? true ,
	};
}

export interface ViewScheduleNoteInput {
	op: ViewScheduleOp;
	phase?: ViewSchedulePhase;
	decision?: string;
	trigger?: ViewScheduleTrigger;
	intent?: 'switch' | 'recover';
	viewId?: string;
	snapshot?: Partial<ViewHierarchySnapshot> | null;
	detail?: Record<string , unknown>;
	/** 传入则写入该链；否则挂到当前活动链（没有则开 orphan 链） */
	chainId?: string;
}

interface ActiveChain {
	id: string;
	seq: number;
	startedAt: number;
	trigger: ViewScheduleTrigger;
	rootOp: ViewScheduleOp;
	viewId: string;
}

export class WhiteScreenMonitor {
	private config: WhiteScreenMonitorConfig;
	private logStream: fs.WriteStream | null = null;
	private viewIdByWebContents = new WeakMap<object , string>();
	private activeChain: ActiveChain | null = null;
	private chainSeqGuard = 0;
	/** 最近一次 blur/hide/minimize 时刻，用于前台链算 bgDurationMs */
	private lastBackgroundAt = 0;
	private lastBackgroundTrigger: Extract<ViewScheduleTrigger , 'blur' | 'hide' | 'minimize'> | '' = '';
	/** 同一次后台→前台周期共用，便于过滤任务栏短切 */
	private cycleSeqGuard = 0;
	private activeCycleId = '';

	constructor(config?: Partial<WhiteScreenMonitorConfig>) {
		this.config = resolveWhiteScreenMonitorConfig( config );
		if( !this.config.enabled ) {
			return;
		}
		this.initLogStream();
	}

	get enabled(): boolean {
		return this.config.enabled;
	}

	/** 当前活动链 id；无则空串。供 setImmediate 等异步步挂回原链。 */
	get activeChainId(): string {
		this.expireActiveChainIfNeeded();
		return this.activeChain?.id || '';
	}

	instrumentView(view: WebContentsView , viewId: string): void {
		if( !this.config.enabled || !isWebContentsViewAlive( view ) ) {
			return;
		}
		this.viewIdByWebContents.set( view.webContents , viewId );
		this.flush( {
			type: 'schedule' ,
			ts: Date.now() ,
			chainId: 'meta' ,
			seq: 0 ,
			op: 'instrument-view' ,
			phase: 'meta' ,
			viewId ,
			decision: 'registered' ,
		} );
	}

	getViewId(view: WebContentsView | null | undefined): string {
		if( !isWebContentsViewAlive( view ) ) {
			return '';
		}
		return this.viewIdByWebContents.get( view.webContents ) || '';
	}

	/**
	 * 开启一条调度链（window focus/show/restore 或 present 入口）。
	 * 同 trigger 短时重入会复用链，避免 focus+show 双开。
	 */
	begin(opts: {
		trigger: ViewScheduleTrigger;
		op: ViewScheduleOp;
		viewId?: string;
		snapshot?: Partial<ViewHierarchySnapshot> | null;
		detail?: Record<string , unknown>;
	}): string {
		if( !this.config.enabled ) {
			return '';
		}
		this.expireActiveChainIfNeeded();
		const now = Date.now();
		const bgMeta = this.buildBackgroundMeta( now );
		if(
			this.activeChain
			&& now - this.activeChain.startedAt < 400
			&& (
				opts.trigger === this.activeChain.trigger
				|| isForegroundPair( this.activeChain.trigger , opts.trigger )
			)
		) {
			this.note( {
				op: opts.op ,
				phase: 'enter' ,
				trigger: opts.trigger ,
				viewId: opts.viewId || this.activeChain.viewId ,
				snapshot: opts.snapshot ,
				detail: {
					...bgMeta ,
					...( opts.detail || {} ) ,
					reusedChain: true ,
				} ,
				chainId: this.activeChain.id ,
			} );
			return this.activeChain.id;
		}

		if( this.activeChain ) {
			this.end( { decision: 'auto-close-before-new' , detail: { nextTrigger: opts.trigger } } );
		}

		this.chainSeqGuard += 1;
		const id = `sch-${ now.toString( 36 ) }-${ this.chainSeqGuard.toString( 36 ) }`;
		this.activeChain = {
			id ,
			seq: 0 ,
			startedAt: now ,
			trigger: opts.trigger ,
			rootOp: opts.op ,
			viewId: opts.viewId || '' ,
		};
		this.note( {
			op: opts.op ,
			phase: 'enter' ,
			trigger: opts.trigger ,
			viewId: opts.viewId ,
			snapshot: opts.snapshot ,
			detail: {
				...bgMeta ,
				...( opts.detail || {} ) ,
			} ,
			chainId: id ,
		} );
		return id;
	}

	/**
	 * 窗口生命周期同步探针：在 Electron 事件回调里立刻写一条，
	 * 不依赖后续 soft-recover / setImmediate，避免「事件时刻状态」丢失。
	 */
	noteWindowLifecycle(opts: {
		trigger: Extract<ViewScheduleTrigger , 'focus' | 'show' | 'restore' | 'blur' | 'hide' | 'minimize'>;
		win: BrowserWindow | null | undefined;
		viewId?: string;
		activeView?: WebContentsView | null;
		snapshot?: Partial<ViewHierarchySnapshot> | null;
		detail?: Record<string , unknown>;
	}): void {
		if( !this.config.enabled ) {
			return;
		}
		const now = Date.now();
		const isBg = opts.trigger === 'blur' || opts.trigger === 'hide' || opts.trigger === 'minimize';
		if( isBg ) {
			this.touchBackground(
				opts.trigger as Extract<ViewScheduleTrigger , 'blur' | 'hide' | 'minimize'> ,
				now ,
			);
		}
		const windowProbe = probeWindowState( opts.win );
		const layers = this.config.logLayerProbe
			? probeContentLayers( opts.win , ( view ) => this.getViewId( view as WebContentsView ) )
			: undefined;
		const activeProbe = opts.activeView
			? probeWebContentsViewExtras( opts.activeView )
			: null;
		this.flush( {
			type: 'schedule' ,
			ts: now ,
			chainId: 'lifecycle' ,
			seq: 0 ,
			op: 'window-lifecycle' ,
			phase: isBg ? 'bg' : 'enter' ,
			trigger: opts.trigger ,
			viewId: opts.viewId || '' ,
			decision: isBg ? 'background-probe' : 'foreground-probe' ,
			snapshot: opts.snapshot || undefined ,
			detail: {
				cycleId: this.activeCycleId || undefined ,
				...this.buildBackgroundMeta( now ) ,
				window: windowProbe ,
				layers ,
				activeExtras: activeProbe ,
				...( opts.detail || {} ) ,
			} ,
		} );
	}

	/** 会话级环境指纹（settings / chrome / cmdline），与 schedule 分离避免启动竞态 */
	noteSessionEnv(detail: Record<string , unknown>): void {
		if( !this.config.enabled ) {
			return;
		}
		this.flush( {
			type: 'session-env' ,
			ts: Date.now() ,
			detail ,
		} );
	}

	/** 在当前链（或指定 chainId）追加一步 */
	note(input: ViewScheduleNoteInput): void {
		if( !this.config.enabled ) {
			return;
		}
		this.expireActiveChainIfNeeded();

		let chain = this.activeChain;
		if( input.chainId && ( !chain || chain.id !== input.chainId ) ) {
			/* 指定链已结束：仍写入，seq 用独立计数 */
			this.flushSchedule( {
				...input ,
				chainId: input.chainId ,
				seq: -1 ,
			} );
			return;
		}
		if( !chain ) {
			this.begin( {
				trigger: input.trigger || 'orphan' ,
				op: input.op ,
				viewId: input.viewId ,
				snapshot: input.snapshot ,
				detail: input.detail ,
			} );
			return;
		}

		if( input.viewId && !chain.viewId ) {
			chain.viewId = input.viewId;
		}
		chain.seq += 1;
		if( chain.seq > this.config.maxEventsPerChain ) {
			if( chain.seq === this.config.maxEventsPerChain + 1 ) {
				this.flushSchedule( {
					op: 'note' ,
					phase: 'meta' ,
					decision: 'chain-event-cap-reached' ,
					chainId: chain.id ,
					seq: chain.seq ,
					viewId: chain.viewId ,
					detail: { maxEventsPerChain: this.config.maxEventsPerChain } ,
				} );
			}
			return;
		}

		this.flushSchedule( {
			...input ,
			chainId: chain.id ,
			seq: chain.seq ,
			trigger: input.trigger || chain.trigger ,
			viewId: input.viewId || chain.viewId ,
		} );
	}

	end(opts?: {
		decision?: string;
		snapshot?: Partial<ViewHierarchySnapshot> | null;
		detail?: Record<string , unknown>;
	}): void {
		if( !this.config.enabled || !this.activeChain ) {
			return;
		}
		const chain = this.activeChain;
		chain.seq += 1;
		this.flushSchedule( {
			op: chain.rootOp ,
			phase: 'exit' ,
			decision: opts?.decision || 'done' ,
			trigger: chain.trigger ,
			viewId: chain.viewId ,
			snapshot: opts?.snapshot ,
			detail: {
				...( opts?.detail || {} ) ,
				durationMs: Date.now() - chain.startedAt ,
				eventCount: chain.seq ,
			} ,
			chainId: chain.id ,
			seq: chain.seq ,
		} );
		this.activeChain = null;
	}

	/** 后台事件：blur/hide/minimize，独立短链，便于对照「何时丢面」 */
	markBackground(trigger: Extract<ViewScheduleTrigger , 'blur' | 'hide' | 'minimize'> , detail?: Record<string , unknown>): void {
		if( !this.config.enabled ) {
			return;
		}
		const now = Date.now();
		this.touchBackground( trigger , now );
		if( this.activeChain ) {
			this.end( { decision: 'interrupted-by-background' , detail: { background: trigger } } );
		}
		const chainId = this.begin( {
			trigger ,
			op: trigger === 'blur'
				? 'window-blur'
				: trigger === 'hide'
					? 'window-hide'
					: 'window-minimize' ,
			detail: {
				cycleId: this.activeCycleId ,
				...( detail || {} ) ,
			} ,
		} );
		this.end( { decision: 'background-marked' , detail: { chainId , cycleId: this.activeCycleId } } );
	}

	shouldLogBoundsSkipped(): boolean {
		return this.config.logBoundsSkipped;
	}

	captureStack(): string {
		if( !this.config.includeStack ) {
			return '';
		}
		try {
			throw new Error( 'schedule-stack' );
		} catch ( e ) {
			return ( e as Error ).stack?.split( '\n' ).slice( 2 , 8 ).join( '\n' ) || '';
		}
	}

	dispose(): void {
		if( this.activeChain ) {
			this.end( { decision: 'dispose' } );
		}
		if( this.logStream ) {
			try {
				this.logStream.write( JSON.stringify( {
					ts: Date.now() ,
					type: 'session-end' ,
				} ) + '\n' );
				this.logStream.end();
			} catch { /* 静默 */ }
		}
		this.logStream = null;
	}

	private touchBackground(
		trigger: Extract<ViewScheduleTrigger , 'blur' | 'hide' | 'minimize'> ,
		now = Date.now() ,
	): void {
		/* minimize 后几毫秒常跟 blur：共用 cycleId，便于任务栏短切对照 */
		if( this.activeCycleId && this.lastBackgroundAt && now - this.lastBackgroundAt < 80 ) {
			this.lastBackgroundTrigger = trigger;
			return;
		}
		this.lastBackgroundAt = now;
		this.lastBackgroundTrigger = trigger;
		this.cycleSeqGuard += 1;
		this.activeCycleId = `cyc-${ now.toString( 36 ) }-${ this.cycleSeqGuard.toString( 36 ) }`;
	}

	private buildBackgroundMeta(now: number): Record<string , unknown> {
		if( !this.lastBackgroundAt ) {
			return {
				cycleId: this.activeCycleId || undefined ,
			};
		}
		return {
			cycleId: this.activeCycleId || undefined ,
			bgDurationMs: Math.max( 0 , now - this.lastBackgroundAt ) ,
			lastBackgroundTrigger: this.lastBackgroundTrigger || undefined ,
		};
	}

	private expireActiveChainIfNeeded(): void {
		if( !this.activeChain ) {
			return;
		}
		if( Date.now() - this.activeChain.startedAt <= this.config.chainTtlMs ) {
			return;
		}
		this.end( { decision: 'ttl-expired' } );
	}

	private flushSchedule(input: ViewScheduleNoteInput & { chainId: string; seq: number }): void {
		const record: Record<string , unknown> = {
			type: 'schedule' ,
			ts: Date.now() ,
			chainId: input.chainId ,
			seq: input.seq ,
			op: input.op ,
			phase: input.phase || 'action' ,
			trigger: input.trigger ,
			intent: input.intent ,
			viewId: input.viewId || '' ,
			decision: input.decision ,
			snapshot: input.snapshot || undefined ,
			detail: input.detail || undefined ,
		};
		if( this.config.includeStack && ( input.phase === 'enter' || input.phase === 'decision' ) ) {
			record.stack = this.captureStack();
		}
		this.flush( record );
	}

	private initLogStream(): void {
		try {
			const logDir = path.join( app.getPath( 'userData' ) , this.config.logDir );
			if( !fs.existsSync( logDir ) ) {
				fs.mkdirSync( logDir , { recursive: true } );
			}
			const logPath = path.join( logDir , this.config.logFileName );
			this.rotateLogIfNeeded( logPath );
			this.logStream = fs.createWriteStream( logPath , { flags: 'a' } );
			this.logStream.write( JSON.stringify( {
				ts: Date.now() ,
				type: 'session-start' ,
				mode: 'schedule-trace' ,
				config: {
					...this.config ,
					sideEffect: 'none-observe-only' ,
				} ,
				runtime: {
					isPackaged: app.isPackaged ,
					version: app.getVersion() ,
					platform: process.platform ,
					arch: process.arch ,
					electron: process.versions.electron ,
					chrome: process.versions.chrome ,
					commandLineSwitches: collectCommandLineSwitches() ,
				} ,
				agentHint: [
					'Filter type=schedule by chainId; order by seq.' ,
					'Filter op=window-lifecycle by cycleId for taskbar minimize↔restore.' ,
					'Healthy short restore: layout-noop + compositor-owned-noop; no focus-webContents.' ,
					'Maximized minimize snapshot.bounds must stay fullscreen, never 1×1.' ,
					'No capturePage / no surface rebind kick in this mode.' ,
				] ,
			} ) + '\n' );
			console.info(
				`[WhiteScreenMonitor] schedule-trace → ${ logPath }` ,
				`(packaged=${ app.isPackaged })` ,
			);
		} catch ( error ) {
			console.warn( '[WhiteScreenMonitor] Failed to init log stream:' , error );
		}
	}

	private rotateLogIfNeeded(logPath: string): void {
		const maxBytes = this.config.maxLogBytes;
		if( !maxBytes || maxBytes <= 0 || !fs.existsSync( logPath ) ) {
			return;
		}
		try {
			const size = fs.statSync( logPath ).size;
			if( size < maxBytes ) {
				return;
			}
			const rotated = `${ logPath }.1`;
			try {
				if( fs.existsSync( rotated ) ) {
					fs.unlinkSync( rotated );
				}
			} catch { /* 静默 */ }
			fs.renameSync( logPath , rotated );
		} catch ( error ) {
			console.warn( '[WhiteScreenMonitor] Log rotate failed:' , error );
		}
	}

	private flush(record: Record<string , unknown>): void {
		if( !this.logStream ) {
			return;
		}
		try {
			this.logStream.write( JSON.stringify( record ) + '\n' );
		} catch { /* 静默 */ }
	}
}

function isForegroundPair(a: ViewScheduleTrigger , b: ViewScheduleTrigger): boolean {
	const fg = new Set( [ 'focus' , 'show' , 'restore' ] );
	return fg.has( a ) && fg.has( b );
}

function collectCommandLineSwitches(): string[] {
	try {
		return process.argv.filter( ( arg ) => arg.startsWith( '--' ) ).slice( 0 , 40 );
	} catch {
		return [];
	}
}

export function probeWindowState(win: BrowserWindow | null | undefined): WindowStateProbe {
	const empty: WindowStateProbe = {
		focused: false ,
		visible: false ,
		minimized: false ,
		maximized: false ,
		destroyed: true ,
		opacity: null ,
		backgroundColor: null ,
		bounds: null ,
		contentBounds: null ,
		childrenCount: 0 ,
	};
	if( !win ) {
		return empty;
	}
	try {
		if( win.isDestroyed() ) {
			return empty;
		}
	} catch {
		return empty;
	}
	const read = <T>(fn: () => T , fallback: T): T => {
		try {
			return fn();
		} catch {
			return fallback;
		}
	};
	return {
		focused: read( () => win.isFocused() , false ) ,
		visible: read( () => win.isVisible() , false ) ,
		minimized: read( () => win.isMinimized() , false ) ,
		maximized: read( () => win.isMaximized() , false ) ,
		destroyed: false ,
		opacity: read( () => win.getOpacity() , null ) ,
		backgroundColor: read( () => win.getBackgroundColor() , null ) ,
		bounds: read( () => win.getBounds() , null ) ,
		contentBounds: read( () => win.getContentBounds() , null ) ,
		childrenCount: read( () => win.contentView.children.length , 0 ) ,
	};
}

export function probeWebContentsViewExtras(view: WebContentsView | null | undefined): {
	visibilityState: string | null;
	backgroundThrottling: boolean | null;
	viewBackgroundColor: string | null;
	webContentsFocused: boolean | null;
	isLoading: boolean | null;
	url: string | null;
} {
	if( isWebContentsViewDead( view ) || !view ) {
		return {
			visibilityState: null ,
			backgroundThrottling: null ,
			viewBackgroundColor: null ,
			webContentsFocused: null ,
			isLoading: null ,
			url: null ,
		};
	}
	const read = <T>(fn: () => T , fallback: T): T => {
		try {
			return fn();
		} catch {
			return fallback;
		}
	};
	return {
		visibilityState: read( () => {
			const frame = ( view.webContents as { mainFrame?: { visibilityState?: string } } ).mainFrame;
			return frame?.visibilityState ?? null;
		} , null ) ,
		backgroundThrottling: read( () => view.webContents.getBackgroundThrottling() , null ) ,
		viewBackgroundColor: read( () => {
			const anyView = view as WebContentsView & { getBackgroundColor?: () => string };
			return typeof anyView.getBackgroundColor === 'function'
				? anyView.getBackgroundColor()
				: null;
		} , null ) ,
		webContentsFocused: read( () => view.webContents.isFocused() , null ) ,
		isLoading: read( () => view.webContents.isLoading() , null ) ,
		url: read( () => view.webContents.getURL() , null ) ,
	};
}

export function probeContentLayers(
	win: BrowserWindow | null | undefined ,
	resolveViewId: (view: View) => string ,
): LayerChildProbe[] {
	if( !win ) {
		return [];
	}
	try {
		if( win.isDestroyed() ) {
			return [];
		}
	} catch {
		return [];
	}
	let children: View[] = [];
	try {
		children = [ ...win.contentView.children ];
	} catch {
		return [];
	}
	return children.map( ( child , index ) => {
		const read = <T>(fn: () => T , fallback: T): T => {
			try {
				return fn();
			} catch {
				return fallback;
			}
		};
		const anyChild = child as View & {
			webContents?: {
				isDestroyed: () => boolean;
				getBackgroundThrottling: () => boolean;
				visibilityState: string;
				isFocused: () => boolean;
				isLoading: () => boolean;
				getURL: () => string;
			};
			getVisible?: () => boolean;
			getBounds?: () => Rectangle;
			getBackgroundColor?: () => string;
		};
		const hasWc = Boolean( anyChild.webContents );
		const viewId = resolveViewId( child ) || '';
		const probe: LayerChildProbe = {
			index ,
			kind: hasWc ? 'web-contents-view' : ( child ? 'view' : 'unknown' ) ,
			viewId ,
			visible: typeof anyChild.getVisible === 'function'
				? read( () => anyChild.getVisible!() , null )
				: null ,
			bounds: typeof anyChild.getBounds === 'function'
				? read( () => anyChild.getBounds!() , null )
				: null ,
			backgroundColor: typeof anyChild.getBackgroundColor === 'function'
				? read( () => anyChild.getBackgroundColor!() , null )
				: null ,
			backgroundThrottling: null ,
			visibilityState: null ,
			webContentsFocused: null ,
			isLoading: null ,
			url: null ,
		};
		if( hasWc && anyChild.webContents && !anyChild.webContents.isDestroyed() ) {
			const wc = anyChild.webContents;
			probe.backgroundThrottling = read( () => wc.getBackgroundThrottling() , null );
			probe.visibilityState = read( () => {
				const frame = ( wc as { mainFrame?: { visibilityState?: string } } ).mainFrame;
				return frame?.visibilityState ?? null;
			} , null );
			probe.webContentsFocused = read( () => wc.isFocused() , null );
			probe.isLoading = read( () => wc.isLoading() , null );
			probe.url = read( () => wc.getURL() , null );
		}
		return probe;
	} );
}

/**
 * 只读快照中心 view 层级状态（无副作用）。
 */
export function snapshotCenterViewHierarchy(opts: {
	view: WebContentsView | null | undefined;
	viewId?: string;
	attached: boolean;
	ready?: boolean;
	settingsOpened?: boolean;
	mainFocused?: boolean;
	mainVisible?: boolean;
	mainMinimized?: boolean;
	childrenCount?: number;
	windowBackgroundColor?: string;
}): ViewHierarchySnapshot {
	const view = opts.view;
	const destroyed = isWebContentsViewDead( view );
	let bounds: Rectangle | null = null;
	let visible = false;
	let url = '';
	let webContentsFocused = false;
	let isLoading = false;
	let visibilityState: string | undefined;
	let backgroundThrottling: boolean | undefined;
	let viewBackgroundColor: string | undefined;
	if( !destroyed && view ) {
		try { bounds = view.getBounds(); } catch { bounds = null; }
		try { visible = view.getVisible(); } catch { visible = false; }
		try { url = view.webContents.getURL(); } catch { url = ''; }
		try { webContentsFocused = view.webContents.isFocused(); } catch { webContentsFocused = false; }
		try { isLoading = view.webContents.isLoading(); } catch { isLoading = false; }
		try {
			visibilityState = ( view.webContents as { mainFrame?: { visibilityState?: string } } ).mainFrame?.visibilityState;
		} catch { visibilityState = undefined; }
		try { backgroundThrottling = view.webContents.getBackgroundThrottling(); } catch { backgroundThrottling = undefined; }
		try {
			const anyView = view as WebContentsView & { getBackgroundColor?: () => string };
			if( typeof anyView.getBackgroundColor === 'function' ) {
				viewBackgroundColor = anyView.getBackgroundColor();
			}
		} catch { viewBackgroundColor = undefined; }
	}
	return {
		viewId: opts.viewId || '' ,
		attached: opts.attached ,
		visible ,
		bounds ,
		mainFocused: Boolean( opts.mainFocused ) ,
		mainVisible: Boolean( opts.mainVisible ) ,
		mainMinimized: Boolean( opts.mainMinimized ) ,
		webContentsFocused ,
		isLoading ,
		ready: Boolean( opts.ready ) ,
		destroyed ,
		url ,
		settingsOpened: Boolean( opts.settingsOpened ) ,
		childrenCount: opts.childrenCount ,
		visibilityState ,
		backgroundThrottling ,
		windowBackgroundColor: opts.windowBackgroundColor ,
		viewBackgroundColor ,
	};
}

let globalWhiteScreenMonitor: WhiteScreenMonitor | null = null;

export function getWhiteScreenMonitor(
	config?: Partial<WhiteScreenMonitorConfig>,
): WhiteScreenMonitor {
	if( !globalWhiteScreenMonitor || config ) {
		if( globalWhiteScreenMonitor ) {
			globalWhiteScreenMonitor.dispose();
		}
		globalWhiteScreenMonitor = new WhiteScreenMonitor( config );
	}
	return globalWhiteScreenMonitor;
}

/** @deprecated 旧探针 API 已移除；保留别名避免外部残留引用编译失败 */
export type WhiteScreenProbeTrigger = ViewScheduleTrigger;
export type WhiteScreenHierarchySnapshot = ViewHierarchySnapshot;
