/**
 * Settings 开着时从 Switch AI 右键重排：表格跟新序，但不盖掉未保存的 Enabled 草稿。
 * 对应 docs/features/ai-list-reorder.md echo 规则与 manage-ais-save-scopes.md
 */

test( 'menubar reorder echoes into open Settings without wiping unsaved Enabled draft' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	await waitForMainRuntime( electronApp );
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );

	const bravoSwitch = enabledSwitchInRow( settings , E2E_AI_B.id );
	await expect( bravoSwitch ).not.toBeChecked();
	await watchClick( bravoSwitch );
	await expect( bravoSwitch ).toBeChecked();
	await expectTableDirty( settings );
	await expectFooterIdle( settings );

	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	await rightClickDragMenuItem( dropdown , E2E_AI_D.id , E2E_AI_A.id );

	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.persistedAIIds[0] === E2E_AI_D.id,
	);

	await expect( settings.getByTestId( TEST_IDS.settingsRoot ) ).toBeVisible();
	expect( await displayedManageAisIds( settings ) ).toEqual( [
		E2E_AI_D.id ,
		E2E_AI_A.id ,
		E2E_AI_C.id ,
		E2E_AI_B.id,
	] );
	await expect( enabledSwitchInRow( settings , E2E_AI_B.id ) ).toBeChecked();
	await expectTableDirty( settings );
	await expectFooterIdle( settings );

	const disk = await readUserAisFile( userDataDir );
	expect( persistedIdsOf( disk ) ).toEqual( [
		E2E_AI_D.id ,
		E2E_AI_B.id ,
		E2E_AI_A.id ,
		E2E_AI_C.id,
	] );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_B.id )?.disabled ).toBe( true );
} );

import { test , expect } from '../fixtures';
import {
	openSettingsFromApplicationMenu ,
	waitForE2ESnapshot ,
	waitForMainRuntime,
} from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , E2E_AI_D } from '../support/e2e-ais';
import { openSwitchAiMenu , rightClickDragMenuItem } from '../support/switch-ai';
import {
	displayedManageAisIds ,
	enabledSwitchInRow ,
	expectFooterIdle ,
	expectTableDirty ,
	openManageAIs,
} from '../support/settings-ui';
import { watchClick } from '../support/observe';
import { persistedIdsOf , readUserAisFile } from '../support/user-ais-file';
import { TEST_IDS } from '../support/selectors';
