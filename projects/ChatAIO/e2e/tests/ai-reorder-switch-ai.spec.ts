/**
 * Switch AI 右键拖排序：松手写盘、菜单重建、表底 Save 不亮。
 * 磁盘 [A, B关, C, D]，把 D 拖到 A 前 → [D, B关, A, C]。
 * 对应 docs/features/ai-list-reorder.md
 */

test( 'right-click dragging Switch AI persists enabled slots and does not dirty table Save' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	await waitForMainRuntime( electronApp );

	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	await rightClickDragMenuItem( dropdown , E2E_AI_D.id , E2E_AI_A.id );

	const after = await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.persistedAIIds[0] === E2E_AI_D.id
				&& state.enabledAIIds[0] === E2E_AI_D.id;
		} ,
		20_000,
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
	expect( await readSwitchAiItemIds( dropdown ) ).toEqual( [
		E2E_AI_D.id ,
		E2E_AI_A.id ,
		E2E_AI_C.id,
	] );

	const disk = await readUserAisFile( userDataDir );
	expect( persistedIdsOf( disk ) ).toEqual( after.persistedAIIds );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_B.id )?.disabled ).toBe( true );

	await dismissDropdown( electronApp );
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await expectTableIdle( settings );
	await expectFooterIdle( settings );
	expect( await displayedManageAisIds( settings ) ).toEqual( [
		E2E_AI_D.id ,
		E2E_AI_A.id ,
		E2E_AI_C.id ,
		E2E_AI_B.id,
	] );
} );

test( 'Next AI Page after Switch AI reorder follows the new enabled ring' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await waitForMainRuntime( electronApp );
	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	/* 把 C 拖到 A 前：enabled [C, A, D]。从当前 A 点 Next 应变 D；旧序会到 C。
	   把 D 拖到最前只是旋转同一个环，测不出顺序错了。 */
	await rightClickDragMenuItem( dropdown , E2E_AI_C.id , E2E_AI_A.id );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.enabledAIIds[0] === E2E_AI_C.id
				&& state.enabledAIIds[1] === E2E_AI_A.id
				&& state.currentAIViewKey === E2E_AI_A.id;
		},
	);
	expect( await readSwitchAiItemIds( dropdown ) ).toEqual( [
		E2E_AI_C.id ,
		E2E_AI_A.id ,
		E2E_AI_D.id,
	] );

	const nextMenu = await reopenSwitchAiMenu( electronApp , mainWindow );
	await clickOpenMenuItem( nextMenu , MENU_IDS.nextPage );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_D.id,
	);
	await clickNextAiPage( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_C.id,
	);
	await clickNextAiPage( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_A.id,
	);
} );

import { test , expect } from '../fixtures';
import { openSettingsFromApplicationMenu , waitForE2ESnapshot , waitForMainRuntime } from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , E2E_AI_D } from '../support/e2e-ais';
import {
	clickNextAiPage ,
	clickOpenMenuItem ,
	openSwitchAiMenu ,
	readSwitchAiItemIds ,
	reopenSwitchAiMenu ,
	rightClickDragMenuItem ,
	dismissDropdown,
} from '../support/switch-ai';
import { MENU_IDS } from '../support/selectors';
import {
	displayedManageAisIds ,
	expectFooterIdle ,
	expectTableIdle ,
	openManageAIs,
} from '../support/settings-ui';
import { persistedIdsOf , readUserAisFile } from '../support/user-ais-file';
