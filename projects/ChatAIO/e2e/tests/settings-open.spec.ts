/**
 * Application > Settings：中区 badge 变成 Settings 且不可点。
 * 对应 docs/features/menubar-current-ai-dropdown.md 不变量 6。
 */

test( 'opening Settings from Application menu marks badge static' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await expect( settings.getByTestId( TEST_IDS.settingsRoot ) ).toBeVisible();

	const badge = mainWindow.getByTestId( TEST_IDS.currentAiBadge );
	await expect( badge ).toHaveText( /settings/i );
	await expect( badge ).toHaveAttribute( 'aria-disabled' , 'true' );
} );

import { test , expect } from '../fixtures';
import { openSettingsFromApplicationMenu } from '../support/app-probe';
import { TEST_IDS } from '../support/selectors';
