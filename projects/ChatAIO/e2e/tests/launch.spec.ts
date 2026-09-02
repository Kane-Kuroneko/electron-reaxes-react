/**
 * 冷启动：隔离 userData 的返回用户应进入 MainView，menubar 可见。
 * 对应 docs/features/menubar-cold-start-monitor.md
 */

test( 'returning user launches MainView menubar' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await expect( mainWindow.getByTestId( TEST_IDS.menubar ) ).toBeVisible();
	await expect( mainWindow.getByTestId( TEST_IDS.currentAiBadge ) ).toBeVisible();
	const snapshot = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.kind === 'main' && state.enabledAIIds.length > 0,
	);
	expect( snapshot.settingsViewOpened ).toBe( false );
	expect( snapshot.currentAIViewKey.length ).toBeGreaterThan( 0 );
} );

import { test , expect } from '../fixtures';
import { waitForE2ESnapshot } from '../support/app-probe';
import { TEST_IDS } from '../support/selectors';
