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

test( 'closing Settings restores an interactive Current AI badge' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	const badge = mainWindow.getByTestId( TEST_IDS.currentAiBadge );
	await expect( badge ).toHaveAttribute( 'aria-disabled' , 'true' );
	await exitSettingsWithoutSave( electronApp , settings );

	await expect( badge ).not.toHaveAttribute( 'aria-disabled' , 'true' );
	await expect( badge ).not.toHaveText( /settings/i );
	await watchClick( badge );
	const dropdown = await waitForVisibleDropdown( electronApp );
	await watchClick( dropdown.locator( `[data-item-payload="${ E2E_AI_C.id }"]` ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.currentAIViewKey === E2E_AI_C.id,
	);
} );

import { test , expect } from '../fixtures';
import {
	exitSettingsWithoutSave ,
	openSettingsFromApplicationMenu ,
	waitForE2ESnapshot ,
	waitForVisibleDropdown,
} from '../support/app-probe';
import { E2E_AI_C } from '../support/e2e-ais';
import { watchClick } from '../support/observe';
import { TEST_IDS } from '../support/selectors';
