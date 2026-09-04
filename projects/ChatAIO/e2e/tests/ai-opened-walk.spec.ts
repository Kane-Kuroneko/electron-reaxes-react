/**
 * Previous/Next Opened AI（菜单项，对应 Ctrl+[ / ]）只走已打开页的持久化相对序。
 * 冷启动只实例化当前页；先点开 Charlie 后，Next Opened 在 Alpha↔Charlie 之间，不会落到未打开的 Delta。
 * 对应 docs/features/ai-list-reorder.md 与 Menu prev/next-instantiated。
 */

test( 'Next Opened AI only walks instantiated pages in persist order' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const start = await waitForMainRuntime( electronApp );
	expect( start.currentAIViewKey ).toBe( E2E_AI_A.id );
	expect( start.instantiatedAIIds ).toEqual( [ E2E_AI_A.id ] );

	const dropdown = await openSwitchAiMenu( electronApp , mainWindow );
	await expect(
		dropdown.locator( `[data-item-id="${ MENU_IDS.nextInstantiated }"] button` ),
	).toBeDisabled();
	await watchClick( dropdown.locator( `[data-item-payload="${ E2E_AI_C.id }"]` ) );
	const opened = await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.currentAIViewKey === E2E_AI_C.id
				&& state.instantiatedAIIds.includes( E2E_AI_A.id )
				&& state.instantiatedAIIds.includes( E2E_AI_C.id )
				&& state.instantiatedAIIds.includes( E2E_AI_D.id ) === false;
		},
	);
	expect( opened.instantiatedAIIds ).toEqual( [ E2E_AI_A.id , E2E_AI_C.id ] );

	await clickNextOpenedAi( electronApp , mainWindow );
	const afterOpenedNext = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_A.id,
	);
	expect( afterOpenedNext.currentAIViewKey ).toBe( E2E_AI_A.id );
	expect( afterOpenedNext.instantiatedAIIds ).not.toContain( E2E_AI_D.id );

	await clickNextAiPage( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_C.id,
	);
	await clickNextAiPage( electronApp , mainWindow );
	const afterPageWalk = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_D.id,
	);
	expect( afterPageWalk.currentAIViewKey ).toBe( E2E_AI_D.id );
} );

import { test , expect } from '../fixtures';
import { waitForE2ESnapshot , waitForMainRuntime } from '../support/app-probe';
import { E2E_AI_A , E2E_AI_C , E2E_AI_D } from '../support/e2e-ais';
import {
	clickNextAiPage ,
	clickNextOpenedAi ,
	openSwitchAiMenu,
} from '../support/switch-ai';
import { watchClick } from '../support/observe';
import { MENU_IDS } from '../support/selectors';
