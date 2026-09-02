/**
 * MainView 冷启动：产品门闩 + 观测探针。
 *
 * 门闩：菜单项非零 layout 后发 `menu-view:visual-ready`（Phase 5 等这个）。
 * 观测：其余 milestone 走 `menubar:boot-probe`，关掉观测也不能卡住启动。
 * 设计：docs/features/menubar-cold-start-monitor.md
 */

const VISUAL_ITEM_SELECTOR = '.main-view-bar-item, .main-view-context-badge';
const ROOT_SELECTOR = '.main-view-root';

let started = false;
let visualReadySent = false;
let chromeCommitSent = false;

const safeNow = () : number => {
	try {
		if( typeof performance !== 'undefined' && typeof performance.now === 'function' ) {
			return performance.now();
		}
	} catch { /* ignore */ }
	return Date.now();
};

const sendProbe = (
	milestone : MenubarBootMilestone ,
	detail? : Record<string , unknown>,
) => {
	try {
		if( typeof api === 'undefined' || typeof api.reportMenubarBootProbe !== 'function' ) {
			return;
		}
		api.reportMenubarBootProbe( {
			milestone ,
			ts : Date.now() ,
			hrt : safeNow() ,
			detail : detail || {},
		} );
	} catch { /* 观测失败不得影响 menubar */ }
};

const measureRoot = () => {
	const root = document.querySelector( ROOT_SELECTOR ) as HTMLElement | null;
	if( !root ) {
		return { hasRoot : false };
	}
	const rect = root.getBoundingClientRect();
	const item = root.querySelector( VISUAL_ITEM_SELECTOR ) as HTMLElement | null;
	const itemRect = item?.getBoundingClientRect();
	const hasItem = Boolean(
		itemRect
		&& itemRect.width > 8
		&& itemRect.height > 8,
	);
	return {
		hasRoot : true ,
		rootWidth : Math.round( rect.width ) ,
		rootHeight : Math.round( rect.height ) ,
		hasItem ,
		itemWidth : itemRect ? Math.round( itemRect.width ) : 0 ,
		itemHeight : itemRect ? Math.round( itemRect.height ) : 0 ,
		itemCount : root.querySelectorAll( VISUAL_ITEM_SELECTOR ).length ,
	};
};

const maybeSendVisualReady = ( source : string ) => {
	if( visualReadySent ) {
		return;
	}
	const measured = measureRoot();
	if( !measured.hasRoot || measured.rootHeight < 20 || measured.rootWidth < 80 ) {
		return;
	}
	if( !chromeCommitSent ) {
		chromeCommitSent = true;
		sendProbe( 'renderer-chrome-commit' , { ...measured , source } );
	}
	if( !measured.hasItem ) {
		return;
	}
	visualReadySent = true;
	const detail = { ...measured , source };
	try {
		if( typeof api !== 'undefined' && typeof api.menuViewVisualReady === 'function' ) {
			api.menuViewVisualReady( {
				ts : Date.now() ,
				hrt : safeNow() ,
				detail ,
			} );
		}
	} catch { /* 门闩失败则等 Phase 5 超时续行 */ }
};

const scheduleVisualCheck = ( source : string ) => {
	maybeSendVisualReady( source );
	requestAnimationFrame( () => {
		maybeSendVisualReady( `${ source }:raf1` );
		requestAnimationFrame( () => {
			maybeSendVisualReady( `${ source }:raf2` );
		} );
	} );
};

/**
 * 进程内只启动一次。须在 menu-view:ready 之前调用，才能量到 ready 与首绘的缺口。
 */
export const startMenubarColdStartRendererProbe = () => {
	if( started ) {
		return;
	}
	started = true;
	sendProbe( 'renderer-bundle-eval' , {
		visibility : typeof document !== 'undefined' ? document.visibilityState : 'unknown' ,
		readyState : typeof document !== 'undefined' ? document.readyState : 'unknown' ,
	} );

	try {
		const paintObserver = new PerformanceObserver( ( list ) => {
			for( const entry of list.getEntries() ) {
				if( entry.name === 'first-contentful-paint' ) {
					sendProbe( 'renderer-fcp' , {
						startTime : Math.round( entry.startTime ) ,
					} );
					scheduleVisualCheck( 'fcp' );
				}
			}
		} );
		paintObserver.observe( { type : 'paint' , buffered : true } as PerformanceObserverInit );
	} catch { /* 无 paint timing 则靠 layout */ }

	if( typeof MutationObserver === 'function' && document?.documentElement ) {
		const observer = new MutationObserver( () => {
			scheduleVisualCheck( 'mutation' );
			if( visualReadySent ) {
				observer.disconnect();
			}
		} );
		observer.observe( document.documentElement , {
			childList : true ,
			subtree : true ,
		} );
		setTimeout( () => observer.disconnect() , 15000 );
	}

	setTimeout( () => {
		scheduleVisualCheck( 'timeout' );
	} , 50 );
};

export const noteMenubarBootMilestone = (
	milestone : MenubarBootMilestone ,
	detail? : Record<string , unknown>,
) => {
	if( visualReadySent ) {
		scheduleVisualCheck( milestone );
		return;
	}
	sendProbe( milestone , detail );
	scheduleVisualCheck( milestone );
};


import type { MenubarBootMilestone } from '#shared/menubar-cold-start-monitor';
