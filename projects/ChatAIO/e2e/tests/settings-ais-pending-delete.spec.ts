/**
 * 待删除走表底：Save 后菜单与磁盘去掉该页；Undo Changes 还原草稿。
 * 对应 docs/features/manage-ais-save-scopes.md
 */

test( 'table Save after pending delete removes the AI from disk and Switch AI' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	await waitForMainRuntime( electronApp );
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await markAiPendingDelete( settings , E2E_AI_D.id );
	await expectTableDirty( settings );
	await expectFooterIdle( settings );

	const before = await readUserAisFile( userDataDir );
	expect( persistedIdsOf( before ) ).toContain( E2E_AI_D.id );

	await watchClick( tableSave( settings ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.persistedAIIds.includes( E2E_AI_D.id ) === false,
	);
	await expectTableIdle( settings );

	const disk = await readUserAisFile( userDataDir );
	expect( persistedIdsOf( disk ) ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_B.id ,
		E2E_AI_C.id,
	] );

	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	expect( await readSwitchAiItemIds( dropdown ) ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_C.id,
	] );
} );

test( 'table Undo drops pending delete without writing disk' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await markAiPendingDelete( settings , E2E_AI_D.id );
	await expectTableDirty( settings );
	await watchClick( tableUndo( settings ) );
	await expectTableIdle( settings );
	await expect( manageAisRow( settings , E2E_AI_D.id ) ).not.toHaveClass( /ai-row--pending-delete/ );

	const disk = await readUserAisFile( userDataDir );
	expect( persistedIdsOf( disk ) ).toContain( E2E_AI_D.id );
} );

import { test , expect } from '../fixtures';
import {
	openSettingsFromApplicationMenu ,
	waitForE2ESnapshot ,
	waitForMainRuntime,
} from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , E2E_AI_D } from '../support/e2e-ais';
import { openSwitchAiMenu , readSwitchAiItemIds } from '../support/switch-ai';
import {
	expectFooterIdle ,
	expectTableDirty ,
	expectTableIdle ,
	manageAisRow ,
	markAiPendingDelete ,
	openManageAIs ,
	tableSave ,
	tableUndo,
} from '../support/settings-ui';
import { watchClick } from '../support/observe';
import { persistedIdsOf , readUserAisFile } from '../support/user-ais-file';
