/**
 * Previous/Next AI Page（菜单项，对应 Alt+[ / ]）按持久化 enabled 序环切，跳过 disabled。
 * 对应 docs/features/ai-list-reorder.md；与 Previous/Next Opened 必须张开。
 */

test( 'Next and Previous AI Page walk persisted enabled order and wrap' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const start = await waitForMainRuntime( electronApp );
	expect( start.currentAIViewKey ).toBe( E2E_AI_A.id );

	await clickNextAiPage( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_C.id,
	);

	await clickNextAiPage( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_D.id,
	);

	await clickNextAiPage( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_A.id,
	);

	await clickPreviousAiPage( electronApp , mainWindow );
	const wrapped = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_D.id,
	);
	expect( wrapped.currentAIViewKey ).toBe( E2E_AI_D.id );
	expect( wrapped.enabledAIIds ).toEqual( [ ...E2E_ENABLED_IDS ] );
} );

import { test , expect } from '../fixtures';
import { waitForE2ESnapshot , waitForMainRuntime } from '../support/app-probe';
import { E2E_AI_A , E2E_AI_C , E2E_AI_D , E2E_ENABLED_IDS } from '../support/e2e-ais';
import { clickNextAiPage , clickPreviousAiPage } from '../support/switch-ai';
