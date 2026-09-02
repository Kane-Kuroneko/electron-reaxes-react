/**
 * View > Left Prompt Showcase 应打开左侧 PromptView。
 * WebContentsView 不是 Playwright Page，用主进程探针断言可见态。
 * 对应 docs/features/prompt-view.md
 */

test( 'View menu toggles left Prompt Showcase' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const before = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main',
	);
	expect( before.promptLeftVisible ).toBe( false );

	await mainWindow.locator( `[data-menu-id="${ MENU_IDS.view }"] button` ).click();
	const dropdown = await waitForVisibleDropdown( electronApp );
	await dropdown.locator( `[data-item-id="${ MENU_IDS.promptLeft }"]` ).click();

	const after = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main'
			&& state.promptLeftVisible === true
			&& state.promptLeftWidth >= 260,
	);
	expect( after.settingsViewOpened ).toBe( false );
} );

import { test , expect } from '../fixtures';
import { waitForE2ESnapshot , waitForVisibleDropdown } from '../support/app-probe';
import { MENU_IDS } from '../support/selectors';
