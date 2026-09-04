/**
 * Current AI badge 下拉里右键拖：与 Switch AI 同一套 DropdownView，松手写盘。
 * 对应 docs/features/menubar-current-ai-dropdown.md 、docs/features/ai-list-reorder.md
 */

test( 'right-click dragging Current AI dropdown persists the same enabled slots' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	await waitForMainRuntime( electronApp );
	const dropdown = await openCurrentAiMenu( electronApp , mainWindow );
	await expect( dropdown.locator( `[data-item-id="${ MENU_IDS.nextPage }"]` ) ).toHaveCount( 0 );
	await rightClickDragMenuItem( dropdown , E2E_AI_D.id , E2E_AI_A.id );

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
	expect( await readSwitchAiItemIds( dropdown ) ).toEqual( [
		E2E_AI_D.id ,
		E2E_AI_A.id ,
		E2E_AI_C.id,
	] );

	const disk = await readUserAisFile( userDataDir );
	expect( persistedIdsOf( disk ) ).toEqual( after.persistedAIIds );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_B.id )?.disabled ).toBe( true );
} );

import { test , expect } from '../fixtures';
import { waitForE2ESnapshot , waitForMainRuntime } from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , E2E_AI_D } from '../support/e2e-ais';
import {
	openCurrentAiMenu ,
	readSwitchAiItemIds ,
	rightClickDragMenuItem,
} from '../support/switch-ai';
import { persistedIdsOf , readUserAisFile } from '../support/user-ais-file';
import { MENU_IDS } from '../support/selectors';
