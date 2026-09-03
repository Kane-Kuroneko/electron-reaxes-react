export type ChatAioE2ESnapshot = {
	kind : 'guiding' | 'main';
	currentAIViewKey : string;
	settingsViewOpened : boolean;
	promptLeftVisible : boolean;
	promptRightVisible : boolean;
	promptLeftWidth : number;
	promptRightWidth : number;
	enabledAIIds : string[];
	runtimeViewsReady : boolean;
	faults : string[];
};

const CONTEXT_RETRY_RE = /context or browser has been closed|Execution context was destroyed|Target closed|Promise was collected/i;

export const sleep = (ms:number) => {
	return new Promise<void>( ( resolve ) => {
		setTimeout( resolve , ms );
	} );
};

export const retryOnContextError = async<T>(
	run : () => Promise<T> ,
	attempts = 6 ,
	delayMs = 150,
):Promise<T> => {
	let lastError : unknown;
	for( let i = 0; i < attempts; i++ ) {
		try {
			return await run();
		} catch ( error ) {
			lastError = error;
			const message = error instanceof Error ? error.message : String( error );
			if( CONTEXT_RETRY_RE.test( message ) === false || i === attempts - 1 ) {
				throw error;
			}
			await sleep( delayMs );
		}
	}
	throw lastError;
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

export const e2eApplySettings = async(
	electronApp : ElectronApplication ,
	settings : ChatAioE2ESettings,
) => {
	return retryOnContextError( () => electronApp.evaluate( async( _electron , payload ) => {
		const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
		if( !probe ) {
			throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
		}
		return probe.applySettings( payload );
	} , settings ) );
};

export const e2eApplyAIs = async(
	electronApp : ElectronApplication ,
	ais : ChatAioE2EAIItem[],
) => {
	return retryOnContextError( () => electronApp.evaluate( async( _electron , payload ) => {
		const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
		if( !probe ) {
			throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
		}
		return probe.applyAIs( payload );
	} , ais ) );
};

export const e2eUpdateAI = async(
	electronApp : ElectronApplication ,
	id : string ,
	updates : Partial<ChatAioE2EAIItem>,
) => {
	return retryOnContextError( () => electronApp.evaluate( async( _electron , payload ) => {
		const probe = ( globalThis as { __CHATAIO_E2E__? : ChatAioE2EProbe } ).__CHATAIO_E2E__;
		if( !probe ) {
			throw new Error( 'E2E probe missing; expected CHATAIO_E2E=1' );
		}
		return probe.updateAI( payload );
	} , { id , updates } ) );
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
	throw new Error(
		`E2E snapshot wait timed out. last=${ JSON.stringify( last ) }`,
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
	return page;
};

/* Application → Settings；等探针 settingsViewOpened 后再等 Settings Page。
   Settings preload 可能比菜单点击更早把 SettingsView 放进 windows()，用 URL 查找即可。 */
export const openSettingsFromApplicationMenu = async(
	electronApp : ElectronApplication ,
	mainWindow : Page ,
	timeoutMs = 30_000,
) => {
	await mainWindow.locator( `[data-menu-id="${ MENU_IDS.application }"] button` ).click();
	const dropdown = await waitForVisibleDropdown( electronApp );
	await dropdown.locator( `[data-item-id="${ MENU_IDS.settings }"]` ).click();
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.settingsViewOpened === true ,
		timeoutMs,
	);
	return waitForSettingsPage( electronApp , timeoutMs );
};

import type { ElectronApplication , Page } from '@playwright/test';
import { MENU_IDS , TEST_IDS } from './selectors';
