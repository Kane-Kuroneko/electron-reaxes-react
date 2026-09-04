/**
 * 只拨 Enabled、不点表底 Save：行不跳分区，Switch AI 仍没有 Bravo。
 * 对应 docs/features/manage-ais-table-ux.md 不变量 4
 */

test( 'toggling Enabled without Save keeps display partition and Switch AI unchanged' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await waitForMainRuntime( electronApp );
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	expect( await displayedManageAisIds( settings ) ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_C.id ,
		E2E_AI_D.id ,
		E2E_AI_B.id,
	] );

	await watchClick( enabledSwitchInRow( settings , E2E_AI_B.id ) );
	await expect( enabledSwitchInRow( settings , E2E_AI_B.id ) ).toBeChecked();
	await expectTableDirty( settings );
	expect( await displayedManageAisIds( settings ) ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_C.id ,
		E2E_AI_D.id ,
		E2E_AI_B.id,
	] );

	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	expect( await readSwitchAiItemIds( dropdown ) ).toEqual( [ ...E2E_ENABLED_IDS ] );
	expect( await readSwitchAiItemIds( dropdown ) ).not.toContain( E2E_AI_B.id );
} );

import { test , expect } from '../fixtures';
import { openSettingsFromApplicationMenu , waitForMainRuntime } from '../support/app-probe';
import {
	E2E_AI_A ,
	E2E_AI_B ,
	E2E_AI_C ,
	E2E_AI_D ,
	E2E_ENABLED_IDS,
} from '../support/e2e-ais';
import { openSwitchAiMenu , readSwitchAiItemIds } from '../support/switch-ai';
import {
	displayedManageAisIds ,
	enabledSwitchInRow ,
	expectTableDirty ,
	openManageAIs,
} from '../support/settings-ui';
import { watchClick } from '../support/observe';
