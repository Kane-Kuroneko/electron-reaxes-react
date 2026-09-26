/**
 * 壳层页画一颗跟随 CDP 鼠标的光标。Prompt 贴进站点那一拍也会打到当前 AI WCV
 * （仍不对远程 DOM 做 locator）。Playwright mouse 不带动系统指针，OBS 要靠这颗点。
 * 录制全程都要看得见这一颗：preroll 就停在 badge 上，等、打字、切页也不要藏。
 * 同一时刻只亮一颗：新注入的页默认隐藏，只有 setActive 的那页 opacity:1。
 * 禁止在 init 里默认 visible（每页会在 0,0 再长出一颗 = 双光标）。
 * Overlay 宿主必须是 0×0 且不可命中。点击高亮是贴在箭头尖上的小圆环 + pulse()。
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

const cursorInitPages = new WeakSet<Page>();

let demoElectronApp : ElectronApplication | null = null;
let lastActivePage : Page | null = null;
let lastScreen : { x:number; y:number } | null = null;

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

export const rememberDemoCursorScreen = (
	origin:{ x:number; y:number } | null ,
	x:number ,
	y:number,
) => {
	if( origin ) {
		lastScreen = {
			x : origin.x + x ,
			y : origin.y + y,
		};
	}
};

const isPageOpen = ( page:Page | null ) : page is Page => {
	if( !page ) {
		return false;
	}
	try {
		return page.isClosed() === false;
	} catch {
		return false;
	}
};

const clamp = ( value:number , min:number , max:number ) => {
	if( max < min ) {
		return min;
	}
	return Math.min( max , Math.max( min , value ) );
};

export const installDemoCursor = async( page:Page ) => {
	try {
		await installTsxEvalShim( page );
		if( cursorInitPages.has( page ) === false ) {
			await page.addInitScript( {
				content : TSX_EVAL_NAME_SHIM,
			} );
			await page.addInitScript( demoCursorInitScript );
			cursorInitPages.add( page );
		}
		await page.evaluate( demoCursorInitScript );
		const screen = lastScreen;
		const keepVisible = isPageOpen( lastActivePage )
			&& isSameDemoPage( page , lastActivePage )
			&& !!screen;
		if( keepVisible && screen ) {
			const origin = await getDemoPageOrigin( page ) || await readPageScreenFallback( page );
			if( origin ) {
				const localX = clamp( screen.x - origin.x , 0 , origin.width - 1 );
				const localY = clamp( screen.y - origin.y , 0 , origin.height - 1 );
				await applyDemoCursor( page , {
					show : true ,
					x : localX ,
					y : localY,
				} );
				return;
			}
		}
		// 新页 / 非活动页必须藏，否则 Main + Dropdown / AI 会叠两颗
		await applyDemoCursor( page , {
			show : false ,
			x : 0 ,
			y : 0,
		} );
	} catch {
		/* 导航中或已销毁 */
	}
};

export const attachDemoCursor = ( electronApp:ElectronApplication ) => {
	demoElectronApp = electronApp;
	void hideNativeAppCursors( electronApp );
	const attach = ( page:Page ) => {
		void installDemoCursor( page );
		page.on( 'framenavigated' , () => {
			void installDemoCursor( page );
		} );
		page.on( 'close' , () => {
			if( lastActivePage === page ) {
				lastActivePage = null;
				void ensureDemoCursorVisible();
			}
		} );
	};
	electronApp.windows().forEach( attach );
	electronApp.on( 'window' , attach );
};

/** OBS 若开了 Capture Cursor，系统指针会和演示光标叠在一起。所有 WebContents 都藏原生指针。 */
const hideNativeAppCursors = async( electronApp:ElectronApplication ) => {
	try {
		await electronApp.evaluate( ( { app , webContents } ) => {
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

const isSameDemoPage = ( candidate:Page , page:Page ) => {
	if( candidate === page ) {
		return true;
	}
	try {
		return sameDemoPageUrl( candidate.url() , page.url() );
	} catch {
		return false;
	}
};

/** 点击光点必须走 API，不要等 window mousedown：CDP 按下和下拉 hide 都可能吃掉 DOM 事件。 */
export const pulseDemoCursor = async( page:Page ) => {
	await installDemoCursor( page );
	try {
		await page.evaluate( () => {
			const api = ( window as Window & {
				__CHATAIO_DEMO_CURSOR__? : {
					pulse?:() => void;
					setVisible?:( show:boolean ) => void;
				};
			} ).__CHATAIO_DEMO_CURSOR__;
			api?.setVisible?.( true );
			api?.pulse?.();
		} );
	} catch {
		/* 已销毁 */
	}
};

export const setActiveDemoCursor = async( page:Page , localX:number , localY:number ) => {
	const app = demoElectronApp;
	if( !app ) {
		return;
	}
	lastActivePage = page;
	const origin = await getDemoPageOrigin( page ) || await readPageScreenFallback( page );
	rememberDemoCursorScreen( origin , localX , localY );
	const others : Page[] = [];
	let activePage : Page | null = null;
	for( const candidate of app.windows() ) {
		if( isPageOpen( candidate ) === false ) {
			continue;
		}
		if( isSameDemoPage( candidate , page ) ) {
			activePage = candidate;
		} else {
			others.push( candidate );
		}
	}
	for( const candidate of others ) {
		await applyDemoCursor( candidate , {
			show : false ,
			x : 0 ,
			y : 0,
		} );
	}
	await applyDemoCursor( activePage || page , {
		show : true ,
		x : localX ,
		y : localY,
	} );
};

/**
 * 停顿 / 下拉关掉 / 导航重装 overlay 之后，把唯一那颗光标亮回 lastScreen。
 * 没有历史点就落到主壳 menubar 中段，不要在 0,0 冒出来。
 */
export const ensureDemoCursorVisible = async() => {
	const app = demoElectronApp;
	if( !app ) {
		return;
	}
	let page : Page | null = isPageOpen( lastActivePage ) ? lastActivePage : null;
	if( !page || isTransientDemoPage( page ) ) {
		page = findStableDemoShellPage() || page;
	}
	if( !page ) {
		return;
	}
	const origin = await getDemoPageOrigin( page ) || await readPageScreenFallback( page );
	const width = origin?.width || 1;
	const height = origin?.height || 1;
	let localX = Math.round( width / 2 );
	let localY = Math.min( 18 , Math.max( 0 , height - 1 ) );
	if( lastScreen && origin ) {
		localX = clamp( lastScreen.x - origin.x , 0 , width - 1 );
		localY = clamp( lastScreen.y - origin.y , 0 , height - 1 );
	}
	try {
		await page.mouse.move( localX , localY , {
			steps : 1,
		} );
	} catch {
		/* 主壳尚未可点 */
	}
	await setActiveDemoCursor( page , localX , localY );
};

const applyDemoCursor = async( page:Page , payload:{ show:boolean; x:number; y:number } ) => {
	try {
		await page.evaluate( ( next:{ show:boolean; x:number; y:number } ) => {
			const api = ( window as Window & {
				__CHATAIO_DEMO_CURSOR__? : {
					moveTo : ( x:number , y:number ) => void;
					setVisible : ( show:boolean ) => void;
					pulse?:() => void;
				};
			} ).__CHATAIO_DEMO_CURSOR__;
			if( !api ) {
				return;
			}
			if( next.show ) {
				api.moveTo( next.x , next.y );
				api.setVisible( true );
			} else {
				api.setVisible( false );
			}
		} , payload );
	} catch {
		/* 已销毁 */
	}
};

export const findStableDemoShellPage = () => {
	const app = demoElectronApp;
	if( !app ) {
		return null;
	}
	const pages = app.windows();
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
		return await app.evaluate( ( { BrowserWindow } , targetUrl:string ) => {
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
					return sameUrl( wc.getURL() , targetUrl );
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
				if( win.isDestroyed() ) {
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
		} , url );
	} catch {
		return null;
	}
};

const readPageScreenFallback = async( page:Page ):Promise<DemoPageOrigin | null> => {
	try {
		return await page.evaluate( () => {
			const chrome = Math.max( 0 , window.outerHeight - window.innerHeight );
			return {
				x : window.screenX ,
				y : window.screenY + chrome ,
				width : Math.max( 1 , window.innerWidth ) ,
				height : Math.max( 1 , window.innerHeight ),
			};
		} );
	} catch {
		return null;
	}
};

const demoCursorInitScript = () => {
	const id = 'chataio-demo-cursor';
	const glyphId = 'chataio-demo-cursor-glyph';
	const styleId = 'chataio-demo-cursor-style';
	type DemoCursorApi = {
		moveTo : ( x:number , y:number ) => void;
		setVisible : ( show:boolean ) => void;
		pulse : () => void;
	};
	const host = window as Window & {
		__CHATAIO_DEMO_CURSOR__? : DemoCursorApi;
	};
	if(
		document.getElementById( id )
		&& typeof host.__CHATAIO_DEMO_CURSOR__?.pulse === 'function'
		&& ( document.getElementById( styleId ) as HTMLStyleElement | null )?.textContent?.includes( 'chataio-demo-cursor-hit' )
	) {
		return;
	}
	let style = document.getElementById( styleId ) as HTMLStyleElement | null;
	if( !style ) {
		style = document.createElement( 'style' );
		style.id = styleId;
		document.documentElement.appendChild( style );
	}
	style.textContent = [
		'html.chataio-demo-cursor-root, html.chataio-demo-cursor-root * { cursor: none !important; }' ,
		'#chataio-demo-cursor, #chataio-demo-cursor-glyph, #chataio-demo-cursor-ripple { pointer-events: none !important; }' ,
		'#chataio-demo-cursor {' ,
		'position:fixed; left:0; top:0; width:0; height:0; overflow:visible;' ,
		'margin:0; padding:0; pointer-events:none !important; z-index:2147483647;' ,
		'opacity:0;' ,
		'}' ,
		'#chataio-demo-cursor-glyph {' ,
		'position:absolute; left:0; top:0; width:32px; height:32px; overflow:visible;' ,
		'pointer-events:none !important; transform-origin:2px 2px;' ,
		'background-repeat:no-repeat; background-position:0 0; background-size:28px 28px;' ,
		'will-change:transform;' ,
		'}' ,
		'#chataio-demo-cursor-ripple.chataio-demo-cursor-hit {' ,
		'position:absolute; left:2px; top:2px; width:18px; height:18px; margin:-9px 0 0 -9px;' ,
		'border-radius:50%; pointer-events:none !important; opacity:0; transform:scale(.4);' ,
		'box-sizing:border-box; border:2px solid rgba(255,255,255,.96);' ,
		'background:rgba(37,99,235,.22);' ,
		'box-shadow:0 0 0 1px rgba(15,23,42,.55);' ,
		'}' ,
		'#chataio-demo-cursor-ripple.chataio-demo-cursor-hit.is-on { animation:chataio-demo-cursor-flash 280ms ease-out forwards; }' ,
		'@keyframes chataio-demo-cursor-flash { 0% { opacity:1; transform:scale(.4); } 38% { opacity:1; transform:scale(1); } 100% { opacity:0; transform:scale(1.12); } }',
	].join( '' );
	document.documentElement.classList.add( 'chataio-demo-cursor-root' );

	let el = document.getElementById( id );
	if( !el ) {
		el = document.createElement( 'div' );
		el.id = id;
		el.setAttribute( 'aria-hidden' , 'true' );
		document.documentElement.appendChild( el );
	}
	el.replaceChildren();
	el.style.pointerEvents = 'none';
	const glyph = document.createElement( 'div' );
	glyph.id = glyphId;
	glyph.setAttribute( 'aria-hidden' , 'true' );
	glyph.style.pointerEvents = 'none';
	const svg = encodeURIComponent( [
		'<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">' ,
		'<path d="M3.8 2.1 3.8 23.4 9.6 17.8 13.7 26.8 17.3 25.2 13.1 16.2 21 16.2Z" fill="#0b1220"/>' ,
		'<path d="M5.1 4.5 5.1 20.4 9.8 15.8 13.5 24 15.6 23.1 11.8 14.8 18.8 14.8Z" fill="#f8fafc" stroke="#0b1220" stroke-width="1.15" stroke-linejoin="round"/>' ,
		'</svg>',
	].join( '' ) );
	glyph.style.backgroundImage = `url("data:image/svg+xml,${ svg }")`;
	glyph.style.filter = 'drop-shadow(0 0 0.7px #fff) drop-shadow(0 0 1.2px #fff) drop-shadow(0 2px 4px rgba(0,0,0,.42))';
	const ripple = document.createElement( 'div' );
	ripple.id = 'chataio-demo-cursor-ripple';
	ripple.className = 'chataio-demo-cursor-hit';
	ripple.setAttribute( 'aria-hidden' , 'true' );
	ripple.style.pointerEvents = 'none';
	glyph.appendChild( ripple );
	el.appendChild( glyph );

	let px = 0;
	let py = 0;
	let visible = false;
	let down = false;

	const render = () => {
		const scale = down ? 0.88 : 1;
		el.style.opacity = visible ? '1' : '0';
		glyph.style.transform = `translate3d(${ px }px, ${ py }px, 0) scale(${ scale })`;
	};

	const moveTo = ( x:number , y:number ) => {
		px = x;
		py = y;
		render();
	};

	const pulse = () => {
		visible = true;
		render();
		ripple.classList.remove( 'is-on' );
		void ripple.offsetWidth;
		ripple.classList.add( 'is-on' );
	};

	host.__CHATAIO_DEMO_CURSOR__ = {
		moveTo ,
		setVisible : ( show:boolean ) => {
			visible = show === true;
			render();
		} ,
		pulse,
	};

	window.addEventListener( 'mousemove' , ( event ) => {
		moveTo( event.clientX , event.clientY );
	} , true );
	window.addEventListener( 'mousedown' , () => {
		down = true;
		render();
	} , true );
	window.addEventListener( 'mouseup' , () => {
		down = false;
		render();
	} , true );
	render();
};

import type { ElectronApplication , Page } from '@playwright/test';
import { installTsxEvalShim , TSX_EVAL_NAME_SHIM } from './tsx-evaluate';
