/**
 * Switch AI 下拉：读序、点 Prev/Next、右键拖排序。
 * dnd-kit 不吃 locator.dragTo()（那是 HTML5 DnD）；右键 sensor 要 mouse.down({ button:'right' }) + 多步 move。
 * 设计：docs/features/ai-list-reorder.md 、docs/features/e2e-playwright.md
 */

export const dismissDropdown = async( electronApp:ElectronApplication ) => {
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
};

export const waitForDropdownHidden = async(
	electronApp : ElectronApplication ,
	timeoutMs = 10_000,
) => {
	const dropdown = findWindowByUrl( electronApp , 'DropdownView' );
	if( !dropdown ) {
		return;
	}
	await dropdown.getByTestId( TEST_IDS.dropdown ).waitFor( {
		state : 'hidden' ,
		timeout : timeoutMs,
	} );
};

/**
 * Dropdown 已开着时不要直接再点同一个顶级项（会 toggle 关掉）。
 * 先切到 View，再开 Switch AI。closeDropdownView 也不会清 MainView openMenuId。
 */
export const reopenSwitchAiMenu = async(
	electronApp : ElectronApplication ,
	mainWindow : Page,
) => {
	await focusHostWindowForObserve( electronApp );
	await watchClick( mainWindow.locator( `[data-menu-id="${ MENU_IDS.view }"] button` ) );
	await waitForVisibleDropdown( electronApp );
	return openSwitchAiMenu( electronApp , mainWindow );
};

export const openSwitchAiMenu = async(
	electronApp : ElectronApplication ,
	mainWindow : Page,
) => {
	await focusHostWindowForObserve( electronApp );
	await watchClick( mainWindow.locator( `[data-menu-id="${ MENU_IDS.switchAi }"] button` ) );
	const dropdown = await waitForVisibleDropdown( electronApp );
	await enableActionOverlays( dropdown );
	return dropdown;
};

export const readSwitchAiItemIds = async( dropdown:Page ) => {
	const items = dropdown.locator( '[data-item-action="switch-ai"]' );
	await expect( items.first() ).toBeVisible();
	const count = await items.count();
	const ids : string[] = [];
	for( let i = 0; i < count; i++ ) {
		const payload = await items.nth( i ).getAttribute( 'data-item-payload' );
		if( payload ) {
			ids.push( payload );
		}
	}
	return ids;
};

export const clickSwitchAiMenuItem = async(
	electronApp : ElectronApplication ,
	mainWindow : Page ,
	itemId : string,
) => {
	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	await watchClick( dropdown.locator( `[data-item-id="${ itemId }"]` ) );
};

export const switchToAiById = async(
	electronApp : ElectronApplication ,
	mainWindow : Page ,
	aiId : string,
) => {
	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	await watchClick( dropdown.locator( `[data-item-payload="${ aiId }"]` ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.currentAIViewKey === aiId,
	);
};

export const openCurrentAiMenu = async(
	electronApp : ElectronApplication ,
	mainWindow : Page,
) => {
	await focusHostWindowForObserve( electronApp );
	await watchClick( mainWindow.getByTestId( TEST_IDS.currentAiBadge ) );
	const dropdown = await waitForVisibleDropdown( electronApp );
	await enableActionOverlays( dropdown );
	return dropdown;
};

export const clickOpenMenuItem = async( dropdown:Page , itemId:string ) => {
	await watchClick( dropdown.locator( `[data-item-id="${ itemId }"]` ) );
};

export const clickNextAiPage = (
	electronApp : ElectronApplication ,
	mainWindow : Page,
) => {
	return clickSwitchAiMenuItem( electronApp , mainWindow , MENU_IDS.nextPage );
};

export const clickPreviousAiPage = (
	electronApp : ElectronApplication ,
	mainWindow : Page,
) => {
	return clickSwitchAiMenuItem( electronApp , mainWindow , MENU_IDS.prevPage );
};

export const clickNextOpenedAi = (
	electronApp : ElectronApplication ,
	mainWindow : Page,
) => {
	return clickSwitchAiMenuItem( electronApp , mainWindow , MENU_IDS.nextInstantiated );
};

export const clickPreviousOpenedAi = (
	electronApp : ElectronApplication ,
	mainWindow : Page,
) => {
	return clickSwitchAiMenuItem( electronApp , mainWindow , MENU_IDS.prevInstantiated );
};

/**
 * Switch AI 右键拖：activationConstraint.distance = 8。
 * 对齐 Playwright 对 dnd-kit 的建议：不要 dragTo，用 right + steps。
 */
export const rightClickDragMenuItem = async(
	dropdown : Page ,
	sourceAiId : string ,
	targetAiId : string,
) => {
	const source = dropdown.locator( `[data-item-payload="${ sourceAiId }"]` );
	const target = dropdown.locator( `[data-item-payload="${ targetAiId }"]` );
	await expect( source ).toBeVisible();
	await expect( target ).toBeVisible();
	if( isE2EWatch() ) {
		try {
			await source.highlight();
		} catch {
			/* ignore */
		}
		await observePause();
	}
	const sourceBox = await source.boundingBox();
	const targetBox = await target.boundingBox();
	if( !sourceBox || !targetBox ) {
		throw new Error( `Switch AI drag missing box: ${ sourceAiId } → ${ targetAiId }` );
	}
	const fromX = sourceBox.x + sourceBox.width / 2;
	const fromY = sourceBox.y + sourceBox.height / 2;
	const toX = targetBox.x + targetBox.width / 2;
	const toY = targetBox.y + targetBox.height / 2;
	await dropdown.mouse.move( fromX , fromY );
	await dropdown.mouse.down( { button : 'right' } );
	await dropdown.mouse.move( toX , toY , { steps : 20 } );
	await dropdown.mouse.move( toX , toY );
	await dropdown.mouse.up( { button : 'right' } );
	await observePause();
};

import {
	findWindowByUrl ,
	waitForE2ESnapshot ,
	waitForVisibleDropdown,
} from './app-probe';
import {
	enableActionOverlays ,
	focusHostWindowForObserve ,
	isE2EWatch ,
	observePause ,
	watchClick,
} from './observe';
import { MENU_IDS , TEST_IDS } from './selectors';
import { expect , type ElectronApplication , type Page } from '@playwright/test';
