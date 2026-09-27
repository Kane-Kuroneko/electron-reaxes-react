/**
 * 演示指针是一颗始终可见的 56px 置顶小窗，尖端跟屏幕坐标走。
 * 不要画进各页 overlay：MainView 只有 36px 会裁掉；切到 Dropdown 再藏主窗那颗，轨迹就断。
 * 也不要做整客户区透明罩：Windows 忽略 alwaysOnTop level，Dropdown 会把罩子连同箭头一起盖住。
 * 小窗每帧 setBounds + moveTop，开下拉后仍压在列表上面，滑行全程看得到。
 * 穿透用 setIgnoreMouseEvents(true)，禁止 { forward: true }（会抖 menubar）。
 * 点名列表时从当前位置滑到目标行，CDP 只在终点按下。
 * 设计：docs/features/playwright-demo-record.md
 */

const SHELL_URL_FRAGMENTS = [
	'MainView' ,
	'GuidingView' ,
	'DropdownView' ,
	'SettingsView' ,
	'PromptView' ,
	'FloatingView',
];

const CURSOR_LAYER_TITLE = 'chataio-demo-cursor-layer';
const CURSOR_WIN_SIZE = 56;
const CURSOR_HOTSPOT_X = 12;
const CURSOR_HOTSPOT_Y = 12;

let demoElectronApp : ElectronApplication | null = null;
let lastScreen : { x:number; y:number } | null = null;
let layerReady : Promise<void> | null = null;
let electronNameShimmed = false;

export type DemoPageOrigin = {
	x : number;
	y : number;
	width : number;
	height : number;
};

export const isDemoShellPage = ( page:Page ) => {
	const url = page.url();
	return SHELL_URL_FRAGMENTS.some( ( fragment ) => url.includes( fragment ) );
};

export const isTransientDemoPage = ( page:Page ) => {
	const url = page.url();
	return url.includes( 'DropdownView' ) || url.includes( 'FloatingView' );
};

export const isDemoCursorLayerPage = ( page:Page ) => {
	try {
		return page.url().includes( CURSOR_LAYER_TITLE );
	} catch {
		return false;
	}
};

export const sameDemoPageUrl = ( left:string , right:string ) => {
	const normalize = ( url:string ) => {
		try {
			return decodeURIComponent( url ).split( '#' )[0];
		} catch {
			return url.split( '#' )[0];
		}
	};
	const a = normalize( left );
	const b = normalize( right );
	if( a === b ) {
		return true;
	}
	return a.split( '?' )[0] === b.split( '?' )[0];
};

export const getDemoElectronApp = () => {
	return demoElectronApp;
};

export const getDemoCursorScreen = () => {
	return lastScreen;
};

export const installDemoCursor = async( _page:Page ) => {
	await ensureDemoCursorLayer();
};

export const attachDemoCursor = ( electronApp:ElectronApplication ) => {
	demoElectronApp = electronApp;
	void hideNativeAppCursors( electronApp );
	void ensureDemoCursorLayer();
};

/** OBS 若开了 Capture Cursor，系统指针会和演示光标叠在一起。所有 WebContents 都藏原生指针。 */
const hideNativeAppCursors = async( electronApp:ElectronApplication ) => {
	try {
		await shimElectronName( electronApp );
		await electronApp.evaluate( ( { app , webContents } ) => {
			( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				= ( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				|| ( ( target ) => target );
			const css = 'html, body, * { cursor: none !important; }';
			const inject = ( wc:{
				isDestroyed : () => boolean;
				isLoading : () => boolean;
				insertCSS : ( css:string ) => Promise<string>;
				on : ( event:string , listener:() => void ) => void;
			} ) => {
				if( !wc || wc.isDestroyed() ) {
					return;
				}
				const run = () => {
					if( wc.isDestroyed() ) {
						return;
					}
					void wc.insertCSS( css ).catch( () => {} );
				};
				wc.on( 'dom-ready' , run );
				if( wc.isLoading() === false ) {
					run();
				}
			};
			webContents.getAllWebContents().forEach( inject );
			app.on( 'web-contents-created' , ( _event , wc ) => {
				inject( wc );
			} );
		} );
	} catch {
		/* 启动中 */
	}
};

const shimElectronName = async( app:ElectronApplication ) => {
	if( electronNameShimmed ) {
		return;
	}
	try {
		await app.evaluate( () => {
			( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				= ( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				|| ( ( target ) => target );
		} );
		electronNameShimmed = true;
	} catch {
		/* 主进程尚未可 evaluate */
	}
};

export const ensureDemoCursorLayer = async() => {
	const app = demoElectronApp;
	if( !app ) {
		return;
	}
	await shimElectronName( app );
	if( !layerReady ) {
		layerReady = createDemoCursorLayer( app ).catch( ( error ) => {
			layerReady = null;
			throw error;
		} );
	}
	await layerReady;
	await raiseDemoCursorLayer();
};

const createDemoCursorLayer = async( app:ElectronApplication ) => {
	const placed = await app.evaluate( async( { BrowserWindow } , payload:{
		title : string;
		html : string;
		size : number;
		hotspotX : number;
		hotspotY : number;
	} ) => {
		( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
			= ( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
			|| ( ( target ) => target );
		let layer = BrowserWindow.getAllWindows().find( ( win ) => {
			return win.isDestroyed() === false && win.getTitle() === payload.title;
		} );
		const host = BrowserWindow.getAllWindows().find( ( win ) => {
			if( win.isDestroyed() || win.getTitle() === payload.title ) {
				return false;
			}
			const url = win.webContents.getURL();
			return url.includes( 'MainView' ) || url.includes( 'GuidingView' );
		} );
		const hostBounds = host
			? host.getContentBounds()
			: {
				x : 80 ,
				y : 80 ,
				width : 1600 ,
				height : 900,
			};
		const screenX = hostBounds.x + Math.min( 220 , Math.max( 48 , hostBounds.width / 2 ) );
		const screenY = hostBounds.y + 18;
		if( !layer ) {
			layer = new BrowserWindow( {
				x : Math.round( screenX - payload.hotspotX ) ,
				y : Math.round( screenY - payload.hotspotY ) ,
				width : payload.size ,
				height : payload.size ,
				frame : false ,
				transparent : true ,
				backgroundColor : '#00000000' ,
				hasShadow : false ,
				skipTaskbar : true ,
				focusable : false ,
				show : false ,
				resizable : false ,
				movable : false ,
				minimizable : false ,
				maximizable : false ,
				fullscreenable : false ,
				alwaysOnTop : true ,
				paintWhenInitiallyHidden : true ,
				roundedCorners : false ,
				webPreferences : {
					nodeIntegration : false ,
					contextIsolation : true ,
					backgroundThrottling : false,
				},
			} );
			layer.setTitle( payload.title );
			layer.setMenu( null );
			layer.setIgnoreMouseEvents( true );
			await layer.loadURL( `data:text/html;charset=utf-8,${ encodeURIComponent( payload.html ) }` );
		}
		layer.setAlwaysOnTop( true );
		layer.setBounds( {
			x : Math.round( screenX - payload.hotspotX ) ,
			y : Math.round( screenY - payload.hotspotY ) ,
			width : payload.size ,
			height : payload.size,
		} );
		layer.setOpacity( 1 );
		layer.showInactive();
		layer.moveTop();
		return {
			x : screenX ,
			y : screenY,
		};
	} , {
		title : CURSOR_LAYER_TITLE ,
		html : demoCursorLayerHtml() ,
		size : CURSOR_WIN_SIZE ,
		hotspotX : CURSOR_HOTSPOT_X ,
		hotspotY : CURSOR_HOTSPOT_Y,
	} );
	if( placed && !lastScreen ) {
		lastScreen = placed;
	}
};

export const syncDemoCursorLayerBounds = async() => {
	const screen = lastScreen;
	if( screen ) {
		await moveDemoCursorScreen( screen.x , screen.y );
		return;
	}
	await raiseDemoCursorLayer();
};

export const raiseDemoCursorLayer = async() => {
	const app = demoElectronApp;
	if( !app ) {
		return;
	}
	try {
		await shimElectronName( app );
		await app.evaluate( ( { BrowserWindow } , title:string ) => {
			( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				= ( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				|| ( ( target ) => target );
			const layer = BrowserWindow.getAllWindows().find( ( win ) => {
				return win.isDestroyed() === false && win.getTitle() === title;
			} );
			if( !layer ) {
				return;
			}
			layer.setAlwaysOnTop( true );
			layer.setOpacity( 1 );
			if( layer.isVisible() === false ) {
				layer.showInactive();
			}
			layer.moveTop();
		} , CURSOR_LAYER_TITLE );
	} catch {
		/* 关窗过程 */
	}
};

const placeCursorWindow = async( screenX:number , screenY:number ) => {
	const app = demoElectronApp;
	if( !app ) {
		return;
	}
	lastScreen = {
		x : screenX ,
		y : screenY,
	};
	try {
		await shimElectronName( app );
		await app.evaluate( ( { BrowserWindow } , payload:{
			title : string;
			x : number;
			y : number;
			size : number;
			hotspotX : number;
			hotspotY : number;
		} ) => {
			( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				= ( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				|| ( ( target ) => target );
			const layer = BrowserWindow.getAllWindows().find( ( win ) => {
				return win.isDestroyed() === false && win.getTitle() === payload.title;
			} );
			if( !layer ) {
				return;
			}
			layer.setBounds( {
				x : Math.round( payload.x - payload.hotspotX ) ,
				y : Math.round( payload.y - payload.hotspotY ) ,
				width : payload.size ,
				height : payload.size,
			} );
			layer.setAlwaysOnTop( true );
			layer.setOpacity( 1 );
			if( layer.isVisible() === false ) {
				layer.showInactive();
			}
			layer.moveTop();
		} , {
			title : CURSOR_LAYER_TITLE ,
			x : screenX ,
			y : screenY ,
			size : CURSOR_WIN_SIZE ,
			hotspotX : CURSOR_HOTSPOT_X ,
			hotspotY : CURSOR_HOTSPOT_Y,
		} );
	} catch {
		/* 层尚未就绪 */
	}
};

export const moveDemoCursorScreen = async( screenX:number , screenY:number ) => {
	await ensureDemoCursorLayer();
	await placeCursorWindow( screenX , screenY );
};

/**
 * 整段滑行在 Electron 主进程里 setBounds，避免每帧 Playwright IPC 把轨迹打成瞬移。
 */
export const animateDemoCursorAlong = async( path:{
	from : { x:number; y:number };
	to : { x:number; y:number };
	ctrl : { x:number; y:number };
	duration : number;
	steps : number;
} ) => {
	await ensureDemoCursorLayer();
	const app = demoElectronApp;
	if( !app ) {
		lastScreen = path.to;
		return;
	}
	lastScreen = path.to;
	try {
		await shimElectronName( app );
		await app.evaluate( async( { BrowserWindow } , payload:{
			title : string;
			from : { x:number; y:number };
			to : { x:number; y:number };
			ctrl : { x:number; y:number };
			duration : number;
			steps : number;
			size : number;
			hotspotX : number;
			hotspotY : number;
		} ) => {
			( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				= ( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				|| ( ( target ) => target );
			const layer = BrowserWindow.getAllWindows().find( ( win ) => {
				return win.isDestroyed() === false && win.getTitle() === payload.title;
			} );
			if( !layer ) {
				return;
			}
			const started = Date.now();
			for( let i = 1; i <= payload.steps; i++ ) {
				const t = i / payload.steps;
				const eased = t * t * ( 3 - 2 * t );
				const rest = 1 - eased;
				const nx = rest * rest * payload.from.x
					+ 2 * rest * eased * payload.ctrl.x
					+ eased * eased * payload.to.x;
				const ny = rest * rest * payload.from.y
					+ 2 * rest * eased * payload.ctrl.y
					+ eased * eased * payload.to.y;
				layer.setBounds( {
					x : Math.round( nx - payload.hotspotX ) ,
					y : Math.round( ny - payload.hotspotY ) ,
					width : payload.size ,
					height : payload.size,
				} );
				layer.setAlwaysOnTop( true );
				layer.setOpacity( 1 );
				if( layer.isVisible() === false ) {
					layer.showInactive();
				}
				layer.moveTop();
				const expected = Math.round( payload.duration * t );
				const elapsed = Date.now() - started;
				if( expected > elapsed ) {
					await new Promise( ( resolve ) => {
						setTimeout( resolve , expected - elapsed );
					} );
				}
			}
			layer.setBounds( {
				x : Math.round( payload.to.x - payload.hotspotX ) ,
				y : Math.round( payload.to.y - payload.hotspotY ) ,
				width : payload.size ,
				height : payload.size,
			} );
			layer.setAlwaysOnTop( true );
			layer.showInactive();
			layer.moveTop();
		} , {
			title : CURSOR_LAYER_TITLE ,
			from : path.from ,
			to : path.to ,
			ctrl : path.ctrl ,
			duration : path.duration ,
			steps : path.steps ,
			size : CURSOR_WIN_SIZE ,
			hotspotX : CURSOR_HOTSPOT_X ,
			hotspotY : CURSOR_HOTSPOT_Y,
		} );
	} catch {
		await placeCursorWindow( path.to.x , path.to.y );
	}
};

/** 点击光点打在屏幕指针上，不要打在会被裁掉的页内 overlay。 */
export const pulseDemoCursor = async( _page?:Page ) => {
	await ensureDemoCursorLayer();
	const app = demoElectronApp;
	if( !app ) {
		return;
	}
	try {
		await shimElectronName( app );
		await app.evaluate( async( { BrowserWindow } , title:string ) => {
			( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				= ( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				|| ( ( target ) => target );
			const layer = BrowserWindow.getAllWindows().find( ( win ) => {
				return win.isDestroyed() === false && win.getTitle() === title;
			} );
			if( !layer ) {
				return;
			}
			layer.setAlwaysOnTop( true );
			layer.setOpacity( 1 );
			if( layer.isVisible() === false ) {
				layer.showInactive();
			}
			layer.moveTop();
			await layer.webContents.executeJavaScript(
				'window.__CHATAIO_DEMO_CURSOR_LAYER__&&window.__CHATAIO_DEMO_CURSOR_LAYER__.pulse()',
			);
		} , CURSOR_LAYER_TITLE );
	} catch {
		/* 已销毁 */
	}
};

/**
 * 停顿 / 下拉关掉之后：指针留在屏幕原处（那就是轨迹），不要夹回 menubar 36px，也不要藏起来。
 */
export const ensureDemoCursorVisible = async() => {
	await ensureDemoCursorLayer();
	const screen = lastScreen;
	if( screen ) {
		await placeCursorWindow( screen.x , screen.y );
		return;
	}
	await raiseDemoCursorLayer();
};

export const findStableDemoShellPage = () => {
	const app = demoElectronApp;
	if( !app ) {
		return null;
	}
	const pages = app.windows().filter( ( page ) => isDemoCursorLayerPage( page ) === false );
	return pages.find( ( page ) => page.url().includes( 'MainView' ) )
		|| pages.find( ( page ) => page.url().includes( 'GuidingView' ) )
		|| null;
};

/**
 * Playwright Page 可能是独立 BW，也可能是主窗里的 WCV。
 * 用 View 树算屏幕原点，不能只用 BrowserWindow.getContentBounds（主壳已被裁到 menubar）。
 * URL 比较必须去掉 hash / query：MainView 带 ?theme=，编码也不保证两边一致。
 */
export const getDemoPageOrigin = async( page:Page ):Promise<DemoPageOrigin | null> => {
	const app = demoElectronApp;
	if( !app ) {
		return null;
	}
	const url = page.url();
	try {
		await shimElectronName( app );
		return await app.evaluate( ( { BrowserWindow } , payload:{
			targetUrl : string;
			layerTitle : string;
		} ) => {
			( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				= ( globalThis as { __name? : ( target:unknown ) => unknown } ).__name
				|| ( ( target ) => target );
			const sameUrl = ( current:string , target:string ) => {
				const normalize = ( value:string ) => {
					try {
						return decodeURIComponent( value ).split( '#' )[0];
					} catch {
						return value.split( '#' )[0];
					}
				};
				const a = normalize( current );
				const b = normalize( target );
				if( a === b ) {
					return true;
				}
				return a.split( '?' )[0] === b.split( '?' )[0];
			};
			const matches = ( wc:{ isDestroyed:() => boolean; getURL:() => string } | null | undefined ) => {
				if( !wc || wc.isDestroyed() ) {
					return false;
				}
				try {
					return sameUrl( wc.getURL() , payload.targetUrl );
				} catch {
					return false;
				}
			};
			const walk = (
				view:{
					getBounds?:() => { x:number; y:number; width:number; height:number };
					webContents?:{ isDestroyed:() => boolean; getURL:() => string };
					children?:unknown[];
				} | null | undefined ,
				accX:number ,
				accY:number,
			) => {
				if( !view ) {
					return null;
				}
				let bounds = {
					x : 0 ,
					y : 0 ,
					width : 0 ,
					height : 0,
				};
				try {
					if( typeof view.getBounds === 'function' ) {
						bounds = view.getBounds();
					}
				} catch {
					return null;
				}
				const x = accX + bounds.x;
				const y = accY + bounds.y;
				if( view.webContents && matches( view.webContents ) ) {
					return {
						x ,
						y ,
						width : Math.max( 1 , bounds.width ) ,
						height : Math.max( 1 , bounds.height ),
					};
				}
				const children = Array.isArray( view.children ) ? view.children : [];
				for( const child of children ) {
					const hit = walk( child as typeof view , x , y );
					if( hit ) {
						return hit;
					}
				}
				return null;
			};
			for( const win of BrowserWindow.getAllWindows() ) {
				if( win.isDestroyed() || win.getTitle() === payload.layerTitle ) {
					continue;
				}
				const content = win.getContentBounds();
				const contentView = win.contentView as {
					parent?:unknown;
					getBounds?:() => { x:number; y:number; width:number; height:number };
					webContents?:{ isDestroyed:() => boolean; getURL:() => string };
					children?:unknown[];
				};
				const root = contentView?.parent
					? contentView.parent as typeof contentView
					: contentView;
				const hit = walk( root , content.x , content.y );
				if( hit ) {
					return hit;
				}
				if( matches( win.webContents ) ) {
					return {
						x : content.x ,
						y : content.y ,
						width : Math.max( 1 , content.width ) ,
						height : Math.max( 1 , content.height ),
					};
				}
			}
			return null;
		} , {
			targetUrl : url ,
			layerTitle : CURSOR_LAYER_TITLE,
		} );
	} catch {
		return null;
	}
};

const demoCursorLayerHtml = () => {
	const svg = encodeURIComponent( [
		'<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">' ,
		'<path d="M3.8 2.1 3.8 23.4 9.6 17.8 13.7 26.8 17.3 25.2 13.1 16.2 21 16.2Z" fill="#0b1220"/>' ,
		'<path d="M5.1 4.5 5.1 20.4 9.8 15.8 13.5 24 15.6 23.1 11.8 14.8 18.8 14.8Z" fill="#f8fafc" stroke="#0b1220" stroke-width="1.15" stroke-linejoin="round"/>' ,
		'</svg>',
	].join( '' ) );
	return [
		'<!doctype html><html><head><meta charset="utf-8"><title>' ,
		CURSOR_LAYER_TITLE ,
		'</title><style>' ,
		'html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden;cursor:none;}' ,
		'#g{position:absolute;left:10px;top:10px;width:32px;height:32px;opacity:1;pointer-events:none;' ,
		'background:url("data:image/svg+xml,' ,
		svg ,
		'") no-repeat 0 0 / 28px 28px;' ,
		'filter:drop-shadow(0 0 0.7px #fff) drop-shadow(0 0 1.2px #fff) drop-shadow(0 2px 4px rgba(0,0,0,.42));}' ,
		'#r{position:absolute;left:2px;top:2px;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;' ,
		'box-sizing:border-box;border:2px solid rgba(255,255,255,.96);background:rgba(37,99,235,.22);' ,
		'box-shadow:0 0 0 1px rgba(15,23,42,.55);opacity:0;transform:scale(.4);pointer-events:none;}' ,
		'#r.on{animation:flash 280ms ease-out forwards;}' ,
		'@keyframes flash{0%{opacity:1;transform:scale(.4)}38%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.12)}}' ,
		'</style></head><body><div id="g"><div id="r"></div></div><script>' ,
		'const r=document.getElementById("r");' ,
		'window.__CHATAIO_DEMO_CURSOR_LAYER__={' ,
		'pulse:function(){r.classList.remove("on");void r.offsetWidth;r.classList.add("on");}' ,
		'};' ,
		'</script></body></html>',
	].join( '' );
};

import type { ElectronApplication , Page } from '@playwright/test';
