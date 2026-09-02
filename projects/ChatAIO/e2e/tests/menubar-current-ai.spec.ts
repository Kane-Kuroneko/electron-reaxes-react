/**
 * 中区 Current AI badge 打开与 Switch AI 同一套 DropdownView，左键切 AI。
 * 对应 docs/features/menubar-current-ai-dropdown.md
 */

test( 'current AI badge opens dropdown and switches AI' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const snapshotBefore = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.enabledAIIds.length > 1,
	);
	const badge = mainWindow.getByTestId( TEST_IDS.currentAiBadge );
	await expect( badge ).toBeVisible();
	const labelBefore = ( await badge.innerText() ).trim();
	expect( labelBefore.length ).toBeGreaterThan( 0 );
	expect( labelBefore ).not.toBe( 'Settings' );

	await badge.click();
	const dropdown = await waitForVisibleDropdown( electronApp );
	const switchItems = dropdown.locator( '[data-item-action="switch-ai"]' );
	await expect( switchItems.first() ).toBeVisible();
	expect( await switchItems.count() ).toBeGreaterThan( 1 );

	const nextId = snapshotBefore.enabledAIIds.find(
		( id ) => id !== snapshotBefore.currentAIViewKey,
	);
	expect( nextId ).toBeTruthy();
	await dropdown.locator( `[data-item-payload="${ nextId }"]` ).click();

	const snapshotAfter = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.currentAIViewKey === nextId,
	);
	expect( snapshotAfter.settingsViewOpened ).toBe( false );
	await expect( badge ).not.toHaveText( labelBefore );
} );

import { test , expect } from '../fixtures';
import { waitForE2ESnapshot , waitForVisibleDropdown } from '../support/app-probe';
import { TEST_IDS } from '../support/selectors';
