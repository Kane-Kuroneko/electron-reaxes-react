export type ChatAioE2ESnapshot = {
	kind : 'guiding' | 'main';
	currentAIViewKey : string;
	settingsViewOpened : boolean;
	promptLeftVisible : boolean;
	promptRightVisible : boolean;
	promptLeftWidth : number;
	promptRightWidth : number;
	enabledAIIds : string[];
	persistedAIIds : string[];
	instantiatedAIIds : string[];
	runtimeViewsReady : boolean;
	faults : string[];
};

const CONTEXT_RETRY_RE = /context or browser has been closed|Execution context was destroyed|Target closed|Promise was collected|garbage collected/i;
/* evaluate 返回值被 GC 时，mutating 调用可能已经跑完；再 retry 会二次 apply。读路径仍可重试。 */
const MUTATE_RETRY_RE = /context or browser has been closed|Execution context was destroyed|Target closed/i;
const GC_RE = /Promise was collected|garbage collected/i;

/* Playwright 用弱引用等 evaluate 的 Promise；纯 JS async 会被 V8 收掉。evaluate 里 setTimeout 钉住 native。见 docs/features/e2e-playwright.md */

export const sleep = (ms:number) => {
	return new Promise<void>( ( resolve ) => {
		setTimeout( resolve , ms );
	} );
};

export const retryOnContextError = async<T>(
	run : () => Promise<T> ,
	attempts = 6 ,
	delayMs = 150 ,
	retryRe : RegExp = CONTEXT_RETRY_RE,
):Promise<T> => {
	let lastError : unknown;
	for( let i = 0; i < attempts; i++ ) {
		try {
			return await run();
		} catch ( error ) {
			lastError = error;
			const message = error instanceof Error ? error.message : String( error );
			if( retryRe.test( message ) === false || i === attempts - 1 ) {
				throw error;
			}
			await sleep( delayMs );
		}
	}
	throw lastError;
};

const isGarbageCollectedError = ( error:unknown ) => {
	const message = error instanceof Error ? error.message : String( error );
	return GC_RE.test( message );
};

const settleAfterGarbageCollected = async() => {
	await sleep( 400 );
};

export const evaluateMain = async<T>(
	electronApp : ElectronApplication ,
	fn : () => T | Promise<T>,
):Promise<T> => {
	return retryOnContextError( () => electronApp.evaluate( fn ) );
};

export const readE2ESnapshot = async( electronApp:ElectronApplication ) => {
	return evaluateMain( electronApp , () => {
		const probe = ( globalThis as {
			__CHATAIO_E2E__? : {
				getSnapshot : () => ChatAioE2ESnapshot;
				drainFaults : () => string[];
			};
		} ).__CHATAIO_E2E__;
		if( !probe ) {
			throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
		}
		return probe.getSnapshot();
	} );
};

export const drainMainFaults = async( electronApp:ElectronApplication ) => {
	try {
		return await evaluateMain( electronApp , () => {
			const probe = ( globalThis as {
				__CHATAIO_E2E__? : { drainFaults : () => string[] };
			} ).__CHATAIO_E2E__;
			return probe ? probe.drainFaults() : [];
		} );
	} catch {
		return [];
	}
};

export type ChatAioE2EAIItem = {
	id : string;
	label : string;
	disabled? : boolean;
	preloadOnStartup? : boolean;
	[key : string] : unknown;
};

export type ChatAioE2ESettings = {
	appearance : {
		theme : string;
		language : string;
		darkmode : boolean;
		[key : string] : unknown;
	};
	startup : {
		aiPageLoadMode : string;
		[key : string] : unknown;
	};
	AIs : ChatAioE2EAIItem[];
	[key : string] : unknown;
};

export type ChatAioE2EApplyResult = {
	success : boolean;
	error? : string;
};

type ChatAioE2EProbe = {
	getSnapshot : () => ChatAioE2ESnapshot;
	drainFaults : () => string[];
	getSettings : () => ChatAioE2ESettings;
	applySettings : ( settings : ChatAioE2ESettings ) => Promise<ChatAioE2EApplyResult>;
	applyAIs : ( ais : ChatAioE2EAIItem[] ) => Promise<ChatAioE2EApplyResult>;
	updateAI : ( payload : {
		id : string;
		updates : Partial<ChatAioE2EAIItem>;
	} ) => Promise<ChatAioE2EAIItem | null>;
};

export const e2eGetSettings = async( electronApp:ElectronApplication ) => {
	return evaluateMain( electronApp , () => {
		const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
		if( !probe ) {
			throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
		}
		return probe.getSettings();
	} );
};

export const e2eApplySettingsMutateInMain = async(
	electronApp : ElectronApplication ,
	patch : {
		aiPageLoadMode? : string;
		disableAllAIs? : boolean;
	},
) => {
	return retryOnContextError( () => electronApp.evaluate( ( electron , nextPatch ) => {
		const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
		if( !probe ) {
			throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
		}
		const current = probe.getSettings();
		const next = {
			...current ,
			startup : {
				...current.startup ,
				aiPageLoadMode : nextPatch.aiPageLoadMode || current.startup.aiPageLoadMode,
			} ,
			AIs : nextPatch.disableAllAIs === true
				? current.AIs.map( ( ai ) => {
					return {
						...ai ,
						disabled : true,
					};
				} )
				: current.AIs,
		};
		return new Promise( ( resolve , reject ) => {
			const timer = setTimeout( () => {
				reject( new Error( 'e2e applySettings timed out' ) );
			} , 30_000 );
			probe.applySettings( next ).then( ( result ) => {
				clearTimeout( timer );
				const after = probe.getSettings();
				resolve( {
					success : result.success === true ,
					error : result.error ,
					requested : nextPatch.aiPageLoadMode ,
					afterAiPageLoadMode : after.startup.aiPageLoadMode ,
					userData : electron.app.getPath( 'userData' ),
				} );
			} , ( error ) => {
				clearTimeout( timer );
				reject( error );
			} );
		} );
	} , patch ) , 4 , 150 , MUTATE_RETRY_RE );
};

export const e2eApplySettings = async(
	electronApp : ElectronApplication ,
	settings : ChatAioE2ESettings,
) => {
	try {
		return await retryOnContextError( () => electronApp.evaluate( async( _electron , json ) => {
			const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
			if( !probe ) {
				throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
			}
			const timer = setTimeout( () => {} , 120_000 );
			try {
				return await probe.applySettings( JSON.parse( json ) );
			} finally {
				clearTimeout( timer );
			}
		} , JSON.stringify( settings ) ) , 4 , 150 , MUTATE_RETRY_RE );
	} catch ( error ) {
		if( isGarbageCollectedError( error ) === false ) {
			throw error;
		}
		await settleAfterGarbageCollected();
		return {
			success : true,
		};
	}
};

export const e2eApplyAIs = async(
	electronApp : ElectronApplication ,
	ais : ChatAioE2EAIItem[],
) => {
	try {
		return await retryOnContextError( () => electronApp.evaluate( async( _electron , payload ) => {
			const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
			if( !probe ) {
				throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
			}
			const timer = setTimeout( () => {} , 120_000 );
			try {
				return await probe.applyAIs( payload );
			} finally {
				clearTimeout( timer );
			}
		} , ais ) , 4 , 150 , MUTATE_RETRY_RE );
	} catch ( error ) {
		if( isGarbageCollectedError( error ) === false ) {
			throw error;
		}
		await settleAfterGarbageCollected();
		return {
			success : true,
		};
	}
};

export const e2eApplyAIsDisableInMain = async(
	electronApp : ElectronApplication ,
	disableId : string,
) => {
	try {
		return await retryOnContextError( () => electronApp.evaluate( async( _electron , id ) => {
			const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
			if( !probe ) {
				throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
			}
			const timer = setTimeout( () => {} , 120_000 );
			try {
				const current = probe.getSettings();
				const next = current.AIs.map( ( ai ) => {
					return {
						...ai ,
						disabled : ai.id === id ? true : ai.disabled === true,
					};
				} );
				return await probe.applyAIs( next );
			} finally {
				clearTimeout( timer );
			}
		} , disableId ) , 4 , 150 , MUTATE_RETRY_RE );
	} catch ( error ) {
		if( isGarbageCollectedError( error ) === false ) {
			throw error;
		}
		await settleAfterGarbageCollected();
		return {
			success : true,
		};
	}
};

export const e2eUpdateAI = async(
	electronApp : ElectronApplication ,
	id : string ,
	updates : Partial<ChatAioE2EAIItem>,
) => {
	try {
		return await retryOnContextError( () => electronApp.evaluate( async( _electron , payload ) => {
			const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
			if( !probe ) {
				throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
			}
			const timer = setTimeout( () => {} , 120_000 );
			try {
				return await probe.updateAI( payload );
			} finally {
				clearTimeout( timer );
			}
		} , { id , updates } ) , 4 , 150 , MUTATE_RETRY_RE );
	} catch ( error ) {
		if( isGarbageCollectedError( error ) === false ) {
			throw error;
		}
		await settleAfterGarbageCollected();
		const settings = await e2eGetSettings( electronApp );
		return settings.AIs.find( ( ai ) => ai.id === id ) || null;
	}
};

export const waitForE2ESnapshot = async(
	electronApp : ElectronApplication ,
	predicate : ( snapshot:ChatAioE2ESnapshot ) => boolean ,
	timeoutMs = 30_000,
) => {
	const started = Date.now();
	let last : ChatAioE2ESnapshot | null = null;
	while( Date.now() - started < timeoutMs ) {
		try {
			last = await readE2ESnapshot( electronApp );
			if( last.faults?.length ) {
				throw new Error(
					`Electron main process fault while waiting for snapshot:\n${ last.faults.join( '\n\n' ) }`,
				);
			}
			if( predicate( last ) ) {
				return last;
			}
		} catch ( error ) {
			const message = error instanceof Error ? error.message : String( error );
			if( last?.faults?.length ) {
				throw error;
			}
			if( CONTEXT_RETRY_RE.test( message ) === false && /E2E probe missing/i.test( message ) === false ) {
				throw error;
			}
			/* 主进程尚未挂探针，或 evaluate 上下文刚被销毁 */
		}
		await sleep( 200 );
	}
	if( last?.faults?.length ) {
		throw new Error(
			`Electron main process fault while waiting for snapshot:\n${ last.faults.join( '\n\n' ) }`,
		);
	}
	if( last && predicate( last ) ) {
		return last;
	}
	throw new Error(
		`E2E snapshot wait timed out. last=${ JSON.stringify( last ) }`,
	);
};

export const waitForMainRuntime = (
	electronApp : ElectronApplication ,
	timeoutMs = 45_000,
) => {
	return waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.kind === 'main'
				&& state.runtimeViewsReady === true
				&& state.enabledAIIds.length > 1
				&& state.currentAIViewKey.length > 0;
		} ,
		timeoutMs,
	);
};

export const pageUrlIncludes = (page:Page , fragment:string) => {
	try {
		return decodeURIComponent( page.url() ).includes( fragment );
	} catch {
		return page.url().includes( fragment );
	}
};

export const findWindowByUrl = (
	electronApp : ElectronApplication ,
	fragment : string,
) => {
	return electronApp.windows().find( ( page ) => pageUrlIncludes( page , fragment ) ) || null;
};

export const waitForWindowByUrl = async(
	electronApp : ElectronApplication ,
	fragment : string ,
	timeoutMs = 30_000,
) => {
	const existing = findWindowByUrl( electronApp , fragment );
	if( existing ) {
		return existing;
	}
	const started = Date.now();
	return new Promise<Page>( ( resolve , reject ) => {
		const onWindow = ( page:Page ) => {
			if( pageUrlIncludes( page , fragment ) ) {
				cleanup();
				resolve( page );
			}
		};
		const timer = setTimeout( () => {
			cleanup();
			reject( new Error( `Timed out waiting for window URL containing ${ fragment }` ) );
		} , Math.max( 0 , timeoutMs - ( Date.now() - started ) ) );
		const cleanup = () => {
			clearTimeout( timer );
			electronApp.off( 'window' , onWindow );
		};
		electronApp.on( 'window' , onWindow );
	} );
};

export const waitForVisibleDropdown = async(
	electronApp : ElectronApplication ,
	timeoutMs = 20_000,
) => {
	const page = await waitForWindowByUrl( electronApp , 'DropdownView' , timeoutMs );
	await page.getByTestId( TEST_IDS.dropdown ).waitFor( {
		state : 'visible' ,
		timeout : timeoutMs,
	} );
	return page;
};

export const dropdownItem = ( dropdown:Page , itemId:string ) => {
	return dropdown.locator( `[data-item-id="${ itemId }"]` );
};

/**
 * 下拉 BrowserWindow 是否真的显示着（主进程事实）。
 * 点菜单项后主进程先 `window.hide()`，渲染端 `hide` 命令清 DOM 要晚 0–60ms（隐藏窗的渲染进程被降优先级，
 * 切 AI 期间 CPU 争用更明显）。只看 DOM 会把「已隐藏窗里的旧菜单」当成开着的菜单。
 */
export const isDropdownWindowVisible = async( electronApp:ElectronApplication ) => {
	try {
		return await electronApp.evaluate( ( { BrowserWindow } ) => {
			return BrowserWindow.getAllWindows().some( ( win ) => {
				return win.isDestroyed() === false
					&& win.webContents.getURL().includes( 'DropdownView' )
					&& win.isVisible();
			} );
		} );
	} catch {
		return false;
	}
};

const isDropdownItemVisible = async( electronApp:ElectronApplication , itemId:string ) => {
	const dropdown = findWindowByUrl( electronApp , 'DropdownView' );
	if( !dropdown ) {
		return false;
	}
	if( await isDropdownWindowVisible( electronApp ) === false ) {
		return false;
	}
	try {
		return await dropdownItem( dropdown , itemId ).isVisible();
	} catch {
		return false;
	}
};

/**
 * 等到指定菜单项出现。DropdownView 是同一扇窗，只等「下拉可见」会把残留的 Switch AI 当成 Application。
 * 见 docs/features/e2e-playwright.md 「写 DOM 用例时记住」第 8 条。
 */
export const waitForDropdownItem = async(
	electronApp : ElectronApplication ,
	itemId : string ,
	timeoutMs = 20_000,
) => {
	const page = await waitForVisibleDropdown( electronApp , timeoutMs );
	await dropdownItem( page , itemId ).waitFor( {
		state : 'visible' ,
		timeout : timeoutMs,
	} );
	return page;
};

export const waitForDropdownHidden = async(
	electronApp : ElectronApplication ,
	timeoutMs = 2_000,
) => {
	const dropdown = findWindowByUrl( electronApp , 'DropdownView' );
	if( !dropdown ) {
		return;
	}
	try {
		await dropdown.getByTestId( TEST_IDS.dropdown ).waitFor( {
			state : 'hidden' ,
			timeout : timeoutMs,
		} );
	} catch {
		/* 已经卸了，或 rebuildMenu 又打开了；调用方用菜单项 id 再确认。 */
	}
};

export const dismissDropdown = async( electronApp : ElectronApplication ) => {
	const dropdown = findWindowByUrl( electronApp , 'DropdownView' );
	if( !dropdown ) {
		return;
	}
	try {
		await dropdown.evaluate( () => {
			const api = ( window as { api?:{ closeDropdownView?:() => void } } ).api;
			api?.closeDropdownView?.();
		} );
	} catch {
		/* 已经关了 */
	}
	await waitForDropdownHidden( electronApp );
};

const topMenuButton = ( mainWindow:Page , menuId:string ) => {
	return mainWindow.locator( `[data-menu-id="${ menuId }"] button` );
};

/**
 * 点顶级菜单，等到目标项可见。点错（toggle 关掉、残留 Switch AI）时先切到另一个顶级菜单再试一次。
 * 对齐 gemini-desktop / Playwright 社区：等具体 item，不要只等下拉窗。
 */
export const openTopMenuUntilItem = async(
	electronApp : ElectronApplication ,
	mainWindow : Page ,
	menuId : string ,
	itemId : string ,
	timeoutMs = 15_000,
) => {
	await focusHostWindowForObserve( electronApp );
	if( await isDropdownItemVisible( electronApp , itemId ) ) {
		const open = await waitForVisibleDropdown( electronApp , timeoutMs );
		await enableActionOverlays( open );
		return open;
	}
	await watchClick( topMenuButton( mainWindow , menuId ) );
	try {
		const dropdown = await waitForDropdownItem( electronApp , itemId , 2_000 );
		await enableActionOverlays( dropdown );
		return dropdown;
	} catch {
		/* 下拉仍是上一份菜单，或同项 toggle 把窗关了。 */
	}
	const resetMenuId = menuId === MENU_IDS.view ? MENU_IDS.application : MENU_IDS.view;
	const resetItemId = resetMenuId === MENU_IDS.view ? MENU_IDS.promptLeft : MENU_IDS.settings;
	await watchClick( topMenuButton( mainWindow , resetMenuId ) );
	await waitForDropdownItem( electronApp , resetItemId , timeoutMs );
	await watchClick( topMenuButton( mainWindow , menuId ) );
	const retry = await waitForDropdownItem( electronApp , itemId , timeoutMs );
	await enableActionOverlays( retry );
	return retry;
};

/* Settings 是中心 WebContentsView，不是独立 BW；Playwright 1.62 起 windows() 仍收得到。
   不要用 electronApp.browserWindow(page)：fromWebContents(WCV) 为 null。
   见 docs/features/e2e-playwright.md 「Settings WCV：探路结论」 */
export const waitForSettingsPage = async(
	electronApp : ElectronApplication ,
	timeoutMs = 30_000,
) => {
	const page = await waitForWindowByUrl( electronApp , 'SettingsView' , timeoutMs );
	await page.getByTestId( TEST_IDS.settingsRoot ).waitFor( {
		state : 'visible' ,
		timeout : timeoutMs,
	} );
	await enableActionOverlays( page );
	await observePause();
	return page;
};

/* Application → Settings。必须等到 Settings 项本身可见，不能只等 Dropdown 窗。
   Switch AI 拖完 rebuildMenu 可能把同一扇下拉再打开；先 dismiss 再点 Application 仍可能点到错误菜单。 */
export const openSettingsFromApplicationMenu = async(
	electronApp : ElectronApplication ,
	mainWindow : Page ,
	timeoutMs = 30_000,
) => {
	await focusHostWindowForObserve( electronApp );
	await dismissDropdown( electronApp );
	const dropdown = await openTopMenuUntilItem(
		electronApp ,
		mainWindow ,
		MENU_IDS.application ,
		MENU_IDS.settings ,
		timeoutMs,
	);
	await watchClick( dropdownItem( dropdown , MENU_IDS.settings ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.settingsViewOpened === true ,
		timeoutMs,
	);
	return waitForSettingsPage( electronApp , timeoutMs );
};

export const exitSettingsWithoutSave = async(
	electronApp : ElectronApplication ,
	settings : Page ,
	timeoutMs = 30_000,
) => {
	await watchClick( settings.getByRole( 'button' , { name : 'Exit Without Save' } ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.settingsViewOpened === false ,
		timeoutMs,
	);
	const mainWindow = findWindowByUrl( electronApp , 'MainView' );
	if( !mainWindow ) {
		return;
	}
	const badge = mainWindow.getByTestId( TEST_IDS.currentAiBadge );
	await badge.waitFor( {
		state : 'visible' ,
		timeout : timeoutMs,
	} );
	/* 已首展 Settings 关掉会 detach；badge 恢复可点再开菜单，避免拆页期间点 Application。 */
	await expect( badge ).not.toHaveAttribute( 'aria-disabled' , 'true' );
};

import { expect , type ElectronApplication , type Page } from '@playwright/test';
import { MENU_IDS , TEST_IDS } from './selectors';
import {
	enableActionOverlays ,
	focusHostWindowForObserve ,
	observePause ,
	watchClick,
} from './observe';
