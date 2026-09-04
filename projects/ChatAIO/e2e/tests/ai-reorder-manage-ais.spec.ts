/**
 * Manage AIs 表内左键拖启用行：松手写盘，disabled 钉原下标，表底 Save 不亮。
 * 展示 [A, C, D, B关]，把 D 拖到 A 前 → 磁盘 [D, B关, A, C]。
 * 对应 docs/features/manage-ais-table-ux.md 、docs/features/ai-list-reorder.md
 */

test( 'left-dragging an enabled Manage AIs row persists slots and does not dirty table Save' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
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

	await leftClickDragManageAisRow( settings , E2E_AI_D.id , E2E_AI_A.id );

	const after = await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.persistedAIIds[0] === E2E_AI_D.id
				&& state.enabledAIIds[0] === E2E_AI_D.id;
		},
	);
	expect( after.persistedAIIds ).toEqual( [
		E2E_AI_D.id ,
		E2E_AI_B.id ,
		E2E_AI_A.id ,
		E2E_AI_C.id,
	] );
	expect( after.enabledAIIds ).toEqual( [
		E2E_AI_D.id ,
		E2E_AI_A.id ,
		E2E_AI_C.id,
	] );
	await expectTableIdle( settings );
	await expectFooterIdle( settings );
	expect( await displayedManageAisIds( settings ) ).toEqual( [
		E2E_AI_D.id ,
		E2E_AI_A.id ,
		E2E_AI_C.id ,
		E2E_AI_B.id,
	] );

	const disk = await readUserAisFile( userDataDir );
	expect( persistedIdsOf( disk ) ).toEqual( after.persistedAIIds );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_B.id )?.disabled ).toBe( true );
} );

import { test , expect } from '../fixtures';
import {
	openSettingsFromApplicationMenu ,
	waitForE2ESnapshot ,
	waitForMainRuntime,
} from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , E2E_AI_D } from '../support/e2e-ais';
import {
	displayedManageAisIds ,
	expectFooterIdle ,
	expectTableIdle ,
	leftClickDragManageAisRow ,
	openManageAIs,
} from '../support/settings-ui';
import { persistedIdsOf , readUserAisFile } from '../support/user-ais-file';
