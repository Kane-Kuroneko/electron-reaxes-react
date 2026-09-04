/**
 * 启用 Bravo 并表底 Save 后：Switch AI 插在 A 与 C 之间，Next AI Page 走 A→B→C。
 * 对应 docs/features/ai-list-reorder.md（disabled 钉原下标）与 manage-ais-save-scopes.md
 */

test( 'enabling Bravo then table Save inserts it into Switch AI and Next AI Page' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await waitForMainRuntime( electronApp );
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_B.id ) );
	await watchClick( tableSave( settings ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.enabledAIIds.includes( E2E_AI_B.id ),
	);
	await expectTableIdle( settings );

	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	expect( await readSwitchAiItemIds( dropdown ) ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_B.id ,
		E2E_AI_C.id ,
		E2E_AI_D.id,
	] );
	await clickOpenMenuItem( dropdown , MENU_IDS.nextPage );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_B.id,
	);
	await clickNextAiPage( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_C.id,
	);
} );

import { test , expect } from '../fixtures';
import {
	openSettingsFromApplicationMenu ,
	waitForE2ESnapshot ,
	waitForMainRuntime,
} from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , E2E_AI_D } from '../support/e2e-ais';
import {
	clickNextAiPage ,
	clickOpenMenuItem ,
	openSwitchAiMenu ,
	readSwitchAiItemIds,
} from '../support/switch-ai';
import {
	enabledSwitchInRow ,
	expectTableIdle ,
	openManageAIs ,
	tableSave,
} from '../support/settings-ui';
import { watchClick } from '../support/observe';
import { MENU_IDS } from '../support/selectors';
