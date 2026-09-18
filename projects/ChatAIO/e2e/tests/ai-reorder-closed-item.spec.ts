/**
 * 关掉中间已打开页后，把另一开启页拖到它上方：不得重新实例化被关页。
 * 根因是 dnd-kit 拖到更小下标后的幽灵 click 误走 switch-ai → showAIView（真 WCV，不是纯 CSS）。
 * Switch AI 与 Current AI badge 共用 DropdownView。对应 docs/features/ai-list-reorder.md
 */

test( 'Switch AI drag above a closed middle page does not re-instantiate it' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await assertClosedCharlieStaysClosedAfterDrag(
		electronApp ,
		mainWindow ,
		() => openSwitchAiMenu( electronApp , mainWindow ),
	);
} );

test( 'Current AI badge drag above a closed middle page does not re-instantiate it' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await assertClosedCharlieStaysClosedAfterDrag(
		electronApp ,
		mainWindow ,
		() => openCurrentAiMenu( electronApp , mainWindow ),
	);
} );

const assertClosedCharlieStaysClosedAfterDrag = async(
	electronApp : ElectronApplication ,
	mainWindow : Page ,
	openMenu : () => Promise<Page>,
) => {
	await waitForMainRuntime( electronApp );
	await switchToAiById( electronApp , mainWindow , E2E_AI_C.id );
	await switchToAiById( electronApp , mainWindow , E2E_AI_D.id );
	await switchToAiById( electronApp , mainWindow , E2E_AI_C.id );
	const opened = await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.currentAIViewKey === E2E_AI_C.id
				&& state.instantiatedAIIds.includes( E2E_AI_A.id )
				&& state.instantiatedAIIds.includes( E2E_AI_C.id )
				&& state.instantiatedAIIds.includes( E2E_AI_D.id );
		},
	);
	expect( opened.instantiatedAIIds ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_C.id ,
		E2E_AI_D.id,
	] );

	await closeCurrentAiPage( electronApp , mainWindow );
	const closed = await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.currentAIViewKey === E2E_AI_D.id
				&& state.instantiatedAIIds.includes( E2E_AI_C.id ) === false;
		},
	);
	expect( closed.instantiatedAIIds ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_D.id,
	] );

	const dropdown = await openMenu();
	expect( await readSwitchAiLoadStates( dropdown ) ).toEqual( [
		{ id : E2E_AI_A.id , loadState : 'instantiated' } ,
		{ id : E2E_AI_C.id , loadState : 'unloaded' } ,
		{ id : E2E_AI_D.id , loadState : 'instantiated' },
	] );

	await rightClickDragMenuItem( dropdown , E2E_AI_D.id , E2E_AI_C.id );
	const after = await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.enabledAIIds[0] === E2E_AI_A.id
				&& state.enabledAIIds[1] === E2E_AI_D.id
				&& state.enabledAIIds[2] === E2E_AI_C.id;
		},
	);
	expect( after.currentAIViewKey ).toBe( E2E_AI_D.id );
	expect( after.instantiatedAIIds ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_D.id,
	] );
	expect( after.instantiatedAIIds ).not.toContain( E2E_AI_C.id );
	expect( after.persistedAIIds ).toEqual( [
		E2E_AI_A.id ,
		E2E_AI_B.id ,
		E2E_AI_D.id ,
		E2E_AI_C.id,
	] );

	const menu = await ensureVisibleSwitchAiMenu(
		dropdown ,
		openMenu ,
		electronApp,
	);
	expect( await readSwitchAiLoadStates( menu ) ).toEqual( [
		{ id : E2E_AI_A.id , loadState : 'instantiated' } ,
		{ id : E2E_AI_D.id , loadState : 'instantiated' } ,
		{ id : E2E_AI_C.id , loadState : 'unloaded' },
	] );
};

import { test , expect } from '../fixtures';
import {
	waitForE2ESnapshot ,
	waitForMainRuntime,
} from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , E2E_AI_D } from '../support/e2e-ais';
import {
	closeCurrentAiPage ,
	ensureVisibleSwitchAiMenu ,
	openCurrentAiMenu ,
	openSwitchAiMenu ,
	readSwitchAiLoadStates ,
	rightClickDragMenuItem ,
	switchToAiById,
} from '../support/switch-ai';
import type { ElectronApplication , Page } from '@playwright/test';
