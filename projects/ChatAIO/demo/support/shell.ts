/**
 * 演示壳层手势：开菜单 / Settings / Prompt。下拉重试对齐 E2E 探路，点击走演示鼠标。
 * 列表点名用 demoClickDirect（禁止扫过）。menubar Prev/Next 点两侧相邻按钮，不走 Switch 菜单。
 * 贴进 AI 输入框见 ai-composer.ts：未登录探中部 composer；登录墙（含 `/sign_in`）则 Next 到有输入框的页。
 * 设计：docs/features/playwright-demo-record.md 、docs/features/playwright-demo-script.md
 */

export type DemoContext = {
	electronApp : ElectronApplication;
	userDataDir : string;
	pace : DemoPace;
	chatAioRoot : string;
};

export const waitForGuiding = async( electronApp:ElectronApplication ) => {
	const page = await waitForWindowByUrl( electronApp , 'GuidingView' , 60_000 );
	await page.getByTestId( TEST_IDS.guidingRoot ).waitFor( {
		state : 'visible' ,
		timeout : 45_000,
	} );
	return page;
};

export const waitForMainShell = async( electronApp:ElectronApplication ) => {
	const page = await waitForWindowByUrl( electronApp , 'MainView' , 60_000 );
	await page.getByTestId( TEST_IDS.menubar ).waitFor( {
		state : 'visible' ,
		timeout : 45_000,
	} );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.currentAIViewKey.length > 0 ,
		45_000,
	);
	return page;
};

export const getMainWindow = ( electronApp:ElectronApplication ) => {
	const page = findWindowByUrl( electronApp , 'MainView' );
	if( !page ) {
		throw new Error( 'MainView not found' );
	}
	return page;
};

const topMenuButton = ( mainWindow:Page , menuId:string ) => {
	return mainWindow.locator( `[data-menu-id="${ menuId }"] button` );
};

export const demoOpenTopMenuUntilItem = async(
	ctx : DemoContext ,
	mainWindow : Page ,
	menuId : string ,
	itemId : string ,
	timeoutMs = 15_000,
) => {
	await presentDemoWindow( ctx.electronApp );
	if( await isDropdownItemVisible( ctx.electronApp , itemId ) ) {
		return waitForVisibleDropdown( ctx.electronApp , timeoutMs );
	}
	await demoClick( topMenuButton( mainWindow , menuId ) , ctx.pace );
	try {
		return await waitForDropdownItem( ctx.electronApp , itemId , 2_500 );
	} catch {
		/* 点到残留菜单或 toggle 关掉了 */
	}
	const resetMenuId = menuId === MENU_IDS.view ? MENU_IDS.application : MENU_IDS.view;
	const resetItemId = resetMenuId === MENU_IDS.view ? MENU_IDS.promptLeft : MENU_IDS.settings;
	await demoClick( topMenuButton( mainWindow , resetMenuId ) , ctx.pace );
	await waitForDropdownItem( ctx.electronApp , resetItemId , timeoutMs );
	await demoClick( topMenuButton( mainWindow , menuId ) , ctx.pace );
	return waitForDropdownItem( ctx.electronApp , itemId , timeoutMs );
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

export const demoOpenSettings = async( ctx:DemoContext ) => {
	const mainWindow = getMainWindow( ctx.electronApp );
	await presentDemoWindow( ctx.electronApp );
	await dismissDropdown( ctx.electronApp );
	const dropdown = await demoOpenTopMenuUntilItem(
		ctx ,
		mainWindow ,
		MENU_IDS.application ,
		MENU_IDS.settings,
	);
	await demoClick( dropdownItem( dropdown , MENU_IDS.settings ) , ctx.pace );
	await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => state.kind === 'main' && state.settingsViewOpened === true ,
		30_000,
	);
	const settings = await waitForWindowByUrl( ctx.electronApp , 'SettingsView' , 30_000 );
	await settings.getByTestId( TEST_IDS.settingsRoot ).waitFor( {
		state : 'visible' ,
		timeout : 30_000,
	} );
	await installDemoCursor( settings );
	return settings;
};

export const demoOpenLeftPrompt = async( ctx:DemoContext ) => {
	const mainWindow = getMainWindow( ctx.electronApp );
	const dropdown = await demoOpenTopMenuUntilItem(
		ctx ,
		mainWindow ,
		MENU_IDS.view ,
		MENU_IDS.promptLeft,
	);
	await demoClick( dropdownItem( dropdown , MENU_IDS.promptLeft ) , ctx.pace );
	await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => state.kind === 'main' && state.promptLeftVisible === true ,
		30_000,
	);
	const prompt = await waitForWindowByUrl( ctx.electronApp , 'PromptView' , 30_000 );
	await prompt.getByTestId( TEST_IDS.promptRoot ).waitFor( {
		state : 'visible' ,
		timeout : 20_000,
	} );
	await installDemoCursor( prompt );
	return prompt;
};

export const demoOpenSwitchAi = async( ctx:DemoContext ) => {
	const mainWindow = getMainWindow( ctx.electronApp );
	return demoOpenTopMenuUntilItem(
		ctx ,
		mainWindow ,
		MENU_IDS.switchAi ,
		MENU_IDS.nextPage,
	);
};

export const demoOpenCurrentAi = async( ctx:DemoContext ) => {
	const mainWindow = getMainWindow( ctx.electronApp );
	await presentDemoWindow( ctx.electronApp );
	await demoClick( mainWindow.getByTestId( TEST_IDS.currentAiBadge ) , ctx.pace );
	return waitForVisibleDropdown( ctx.electronApp );
};

export const waitForCurrentAi = async( ctx:DemoContext , aiId:string , holdMs = ctx.pace.afterSwitchMs ) => {
	const started = Date.now();
	await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => state.kind === 'main' && state.currentAIViewKey === aiId ,
		45_000,
	);
	// 快照等待算进 dwell，切完不要再空等一段 afterSwitch
	await holdRemaining( holdMs , started );
	await ensureDemoCursorVisible();
};

export const demoClickSwitchMenuItem = async( ctx:DemoContext , itemId:string ) => {
	const dropdown = await demoOpenSwitchAi( ctx );
	await demoClick( dropdownItem( dropdown , itemId ) , ctx.pace );
};

export const waitForCurrentAiChange = async(
	ctx:DemoContext ,
	previousId:string ,
	holdMs = ctx.pace.afterSwitchMs,
) => {
	const started = Date.now();
	await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => state.kind === 'main'
			&& state.currentAIViewKey.length > 0
			&& state.currentAIViewKey !== previousId ,
		45_000,
	);
	await holdRemaining( holdMs , started );
	await ensureDemoCursorVisible();
};

export const waitForDemoShowcaseReady = async( ctx:DemoContext ) => {
	await waitForMainShell( ctx.electronApp );
	const vendors = await readBundledVendors( bundledCatalogPath( ctx.chatAioRoot ) );
	const showcase = showcaseVendors( vendors );
	const chatgpt = vendorByFamily( vendors , 'chatgpt' );
	await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => {
			return state.kind === 'main'
				&& state.runtimeViewsReady === true
				&& state.currentAIViewKey === chatgpt.id
				&& showcase.every( ( vendor ) => state.instantiatedAIIds.includes( vendor.id ) );
		} ,
		90_000,
	);
};

export const demoClickMenubarNav = async( ctx:DemoContext , itemId:string ) => {
	const mainWindow = getMainWindow( ctx.electronApp );
	const button = mainWindow.locator( `[data-menu-id="${ itemId }"] button` );
	await button.waitFor( {
		state : 'visible' ,
		timeout : 15_000,
	} );
	await demoClick( button , ctx.pace );
};

export const waitForCurrentAiPage = async( ctx:DemoContext , timeoutMs = 20_000 ):Promise<Page> => {
	const snapshot = await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => state.kind === 'main' && state.currentAIViewKey.length > 0 ,
		20_000,
	);
	const vendors = await readBundledVendors( bundledCatalogPath( ctx.chatAioRoot ) );
	const vendor = vendors.find( ( item ) => item.id === snapshot.currentAIViewKey );
	if( !vendor ) {
		throw new Error( `current AI ${ snapshot.currentAIViewKey } is not in bundled catalog` );
	}
	const started = Date.now();
	while( Date.now() - started < timeoutMs ) {
		const page = await findAiPageByVendor( ctx.electronApp , vendor );
		if( page ) {
			return page;
		}
		await beat( 150 );
	}
	throw new Error( `current AI page missing for ${ vendor.family } (${ vendor.url })` );
};

export const demoPasteIntoCurrentAiComposer = async( ctx:DemoContext , text:string ) => {
	const copied = ( await readDemoClipboardText( ctx.electronApp ) ).trim();
	const payload = copied || text;
	if( await tryPasteIntoCurrentAiComposer( ctx , payload ) ) {
		await beat( ctx.pace.pasteHoldMs );
		return;
	}
	for( let i = 0; i < 6; i++ ) {
		const before = await readCurrentAiViewKey( ctx );
		await demoClickMenubarNav( ctx , MENU_IDS.nextInstantiated );
		await waitForCurrentAiChange( ctx , before , ctx.pace.afterPageMs );
		if( await tryPasteIntoCurrentAiComposer( ctx , payload ) ) {
			await beat( ctx.pace.pasteHoldMs );
			return;
		}
	}
	console.log( '[demo] skip paste: no guest composer on showcase AIs' );
};

const tryPasteIntoCurrentAiComposer = async( ctx:DemoContext , payload:string ) => {
	let page : Page;
	try {
		page = await waitForCurrentAiPage( ctx , 4_000 );
	} catch ( error ) {
		console.log( `[demo] current AI page missing: ${ error instanceof Error ? error.message : String( error ) }` );
		return false;
	}
	if( isLikelyLoginWall( page.url() ) ) {
		console.log( `[demo] skip login wall: ${ page.url() }` );
		return false;
	}
	await installDemoCursor( page );
	await focusDemoPageWebContents( ctx , page );
	let located = await locateAiComposerPoint( page );
	if( !located ) {
		const viewport = await readPageViewport( page );
		await demoClickAt( page , Math.round( viewport.width / 2 ) , Math.round( viewport.height * 0.52 ) , ctx.pace );
		located = await locateAiComposerPoint( page );
	}
	if( !located ) {
		console.log( `[demo] no composer: ${ page.url() }` );
		return false;
	}
	await demoClickAt( page , located.x , located.y , ctx.pace );
	located = await locateAiComposerPoint( page ) || located;
	if( isLikelyLoginWall( page.url() ) || await composerLooksLikeLogin( page ) ) {
		console.log( `[demo] skip paste into login field: ${ page.url() }` );
		return false;
	}
	const focused = await focusAiComposerAt( page , located.x , located.y , located.localX , located.localY );
	if( focused === false ) {
		console.log( `[demo] composer focus failed: ${ page.url() }` );
		return false;
	}
	const inserted = await insertAiComposerText( page , payload );
	console.log(
		`[demo] paste ${ inserted ? 'ok' : 'miss' } ${ page.url() } ${ located.tag } ${ located.hint }`,
	);
	return inserted;
};

const readCurrentAiViewKey = async( ctx:DemoContext ) => {
	const snapshot = await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => state.kind === 'main' && state.currentAIViewKey.length > 0 ,
		20_000,
	);
	return snapshot.currentAIViewKey;
};

const focusDemoPageWebContents = async( ctx:DemoContext , page:Page ) => {
	try {
		await ctx.electronApp.evaluate( ( { webContents , BrowserWindow } , targetUrl:string ) => {
			const normalize = ( value:string ) => {
				try {
					return decodeURIComponent( value ).split( '#' )[0];
				} catch {
					return value.split( '#' )[0];
				}
			};
			const sameUrl = ( current:string , target:string ) => {
				const a = normalize( current );
				const b = normalize( target );
				if( a === b ) {
					return true;
				}
				return a.split( '?' )[0] === b.split( '?' )[0];
			};
			for( const wc of webContents.getAllWebContents() ) {
				if( wc.isDestroyed() ) {
					continue;
				}
				try {
					if( sameUrl( wc.getURL() , targetUrl ) === false ) {
						continue;
					}
					wc.focus();
					const win = BrowserWindow.fromWebContents( wc );
					if( win && win.isDestroyed() === false ) {
						win.focus();
					}
				} catch {
					/* 已销毁 */
				}
			}
		} , page.url() );
	} catch {
		/* 启动中 */
	}
};

const isLikelyLoginWall = ( url:string ) => {
	return /accounts\.google|login\.|signin\.|sign[_-]?in|log[_-]?in|\/auth(?:enticate)?(?:\/|$|\?)|\/oauth/i.test( url );
};

const findAiPageByVendor = async( electronApp:ElectronApplication , vendor:{
	url : string;
	family : string;
} ) => {
	const target = hostOf( vendor.url );
	if( !target ) {
		return null;
	}
	const extras = extraHostsForFamily( vendor.family );
	const matches : { page:Page; score:number }[] = [];
	for( const page of electronApp.windows() ) {
		if( isDemoShellPage( page ) ) {
			continue;
		}
		const host = hostOf( page.url() );
		if( !host ) {
			continue;
		}
		let score = 0;
		if( host === target || host.endsWith( `.${ target }` ) || target.endsWith( `.${ host }` ) ) {
			score = 3;
		} else if( vendor.family.length > 3 && host.includes( vendor.family ) ) {
			score = 2;
		} else if( extras.some( ( extra ) => host === extra || host.endsWith( `.${ extra }` ) ) ) {
			score = 1;
		}
		if( score > 0 ) {
			matches.push( {
				page ,
				score,
			} );
		}
	}
	if( matches.length === 0 ) {
		return null;
	}
	if( matches.length === 1 ) {
		return matches[0].page;
	}
	let best : { page:Page; rank:number } | null = null;
	for( const match of matches ) {
		const area = await readPageArea( match.page );
		const rank = match.score * 1_000_000_000 + area;
		if( !best || rank > best.rank ) {
			best = {
				page : match.page ,
				rank,
			};
		}
	}
	return best?.page || matches[0].page;
};

const extraHostsForFamily = ( family:string ) => {
	if( family === 'gemini' ) {
		return [ 'accounts.google.com' ];
	}
	if( family === 'chatgpt' ) {
		return [ 'openai.com' ];
	}
	return [] as string[];
};

const hostOf = ( url:string ) => {
	try {
		return new URL( url ).hostname.replace( /^www\./ , '' );
	} catch {
		return '';
	}
};

const readPageArea = async( page:Page ) => {
	try {
		return await Promise.race( [
			page.evaluate( () => {
				const visible = document.visibilityState === 'visible' ? 4 : 1;
				return visible * Math.max( 1 , window.innerWidth ) * Math.max( 1 , window.innerHeight );
			} ) ,
			beat( 800 ).then( () => 0 ),
		] );
	} catch {
		return 0;
	}
};

const readPageViewport = async( page:Page ) => {
	try {
		return await page.evaluate( () => {
			return {
				width : Math.max( 1 , window.innerWidth ) ,
				height : Math.max( 1 , window.innerHeight ),
			};
		} );
	} catch {
		return page.viewportSize() || {
			width : 1280 ,
			height : 720,
		};
	}
};

import { demoClick , demoClickAt } from './mouse';
import { beat , holdRemaining , type DemoPace } from './pace';
import { presentDemoWindow } from './launch';
import { installDemoCursor , isDemoShellPage , ensureDemoCursorVisible } from './cursor';
import {
	composerLooksLikeLogin ,
	focusAiComposerAt ,
	insertAiComposerText ,
	locateAiComposerPoint ,
	readDemoClipboardText,
} from './ai-composer';
import { bundledCatalogPath } from './profile';
import {
	readBundledVendors ,
	showcaseVendors ,
	vendorByFamily,
} from './catalog';
import {
	dismissDropdown ,
	dropdownItem ,
	findWindowByUrl ,
	isDropdownWindowVisible ,
	waitForDropdownItem ,
	waitForE2ESnapshot ,
	waitForVisibleDropdown ,
	waitForWindowByUrl,
} from '../../e2e/support/app-probe';
import { MENU_IDS , TEST_IDS } from '../../e2e/support/selectors';
import type { ElectronApplication , Page } from '@playwright/test';
