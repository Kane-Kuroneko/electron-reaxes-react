/**
 * Switch AI / Current AI 下拉顺序 = 磁盘 enabled 序；disabled 不出现在菜单。
 * 对应 docs/features/ai-list-reorder.md 不变量 1、docs/features/menubar-current-ai-dropdown.md
 */

test( 'Switch AI and Current AI dropdown follow persisted enabled order' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await waitForMainRuntime( electronApp );

	const switchDropdown = await openSwitchAiMenu( electronApp , mainWindow );
	const switchIds = await readSwitchAiItemIds( switchDropdown );
	expect( switchIds ).toEqual( [ ...E2E_ENABLED_IDS ] );
	expect( switchIds ).not.toContain( E2E_AI_B.id );
	await expect( switchDropdown.locator( `[data-item-id="${ MENU_IDS.nextPage }"]` ) ).toBeVisible();

	await dismissDropdown( electronApp );

	const badge = mainWindow.getByTestId( TEST_IDS.currentAiBadge );
	await watchClick( badge );
	const currentDropdown = await waitForVisibleDropdown( electronApp );
	const badgeIds = await readSwitchAiItemIds( currentDropdown );
	expect( badgeIds ).toEqual( [ ...E2E_ENABLED_IDS ] );
	await expect( currentDropdown.locator( `[data-item-id="${ MENU_IDS.nextPage }"]` ) ).toHaveCount( 0 );

	const snapshot = await readE2ESnapshot( electronApp );
	expect( snapshot.enabledAIIds ).toEqual( [ ...E2E_ENABLED_IDS ] );
	expect( snapshot.persistedAIIds ).toEqual( [ ...E2E_PERSIST_IDS ] );
} );

import { test , expect } from '../fixtures';
import { readE2ESnapshot , waitForMainRuntime , waitForVisibleDropdown } from '../support/app-probe';
import {
	E2E_AI_B ,
	E2E_ENABLED_IDS ,
	E2E_PERSIST_IDS,
} from '../support/e2e-ais';
import { openSwitchAiMenu , readSwitchAiItemIds , dismissDropdown } from '../support/switch-ai';
import { watchClick } from '../support/observe';
import { MENU_IDS , TEST_IDS } from '../support/selectors';
