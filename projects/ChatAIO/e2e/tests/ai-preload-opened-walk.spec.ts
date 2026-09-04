/**
 * 单独覆盖写 user-ais.json：Charlie preloadOnStartup。
 * 冷启动 instantiated 含 A+C，Next Opened 在二者间环切，不会落到未打开的 Delta。
 * 不要改默认 seed。对应 docs/features/ai-list-reorder.md
 */

const testPreloadCharlie = test.extend( {
	userAisPatch : async( {} , use ) => {
		await use( patchCharliePreloadOnStartup );
	},
} );

testPreloadCharlie( 'startup preload instantiates Charlie for Next Opened' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const start = await waitForE2ESnapshot(
		electronApp ,
		( state ) => {
			return state.kind === 'main'
				&& state.runtimeViewsReady === true
				&& state.instantiatedAIIds.includes( E2E_AI_A.id )
				&& state.instantiatedAIIds.includes( E2E_AI_C.id )
				&& state.instantiatedAIIds.includes( E2E_AI_D.id ) === false;
		} ,
		45_000,
	);
	expect( start.currentAIViewKey ).toBe( E2E_AI_A.id );
	expect( start.instantiatedAIIds ).toEqual( [ E2E_AI_A.id , E2E_AI_C.id ] );

	await clickNextOpenedAi( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_C.id,
	);
	await clickNextOpenedAi( electronApp , mainWindow );
	const wrapped = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_A.id,
	);
	expect( wrapped.instantiatedAIIds ).not.toContain( E2E_AI_D.id );
	/* 这条用例结束很快，Settings preload 可能还在 init；等 WCV 进 windows 再关，避免 teardown 记上 mobx 半截错误。 */
	await waitForWindowByUrl( electronApp , 'SettingsView' , 20_000 );
} );

import { test , expect } from '../fixtures';
import { waitForE2ESnapshot , waitForWindowByUrl } from '../support/app-probe';
import {
	E2E_AI_A ,
	E2E_AI_C ,
	E2E_AI_D ,
	patchCharliePreloadOnStartup,
} from '../support/e2e-ais';
import { clickNextOpenedAi } from '../support/switch-ai';
