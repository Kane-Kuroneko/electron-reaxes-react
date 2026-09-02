/**
 * Application > Settings：中区 badge 变成 Settings 且不可点。
 * 对应 docs/features/menubar-current-ai-dropdown.md 不变量 6。
 */

test( 'opening Settings from Application menu marks badge static' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await mainWindow.locator( `[data-menu-id="${ MENU_IDS.application }"] button` ).click();
	const dropdown = await waitForVisibleDropdown( electronApp );
	await dropdown.locator( `[data-item-id="${ MENU_IDS.settings }"]` ).click();

	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.settingsViewOpened === true,
	);

	const badge = mainWindow.getByTestId( TEST_IDS.currentAiBadge );
	await expect( badge ).toHaveText( /settings/i );
	await expect( badge ).toHaveAttribute( 'aria-disabled' , 'true' );
} );

import { test , expect } from '../fixtures';
import { waitForE2ESnapshot , waitForVisibleDropdown } from '../support/app-probe';
import { MENU_IDS , TEST_IDS } from '../support/selectors';
