// When-Ready: app.whenReady()后的异步逻辑

app.whenReady().then( async() => {
	/* E2E 探针必须在 Guiding / MainRuntime 之前挂上，docs/features/e2e-playwright.md */
	installE2EMainProbe();
	registerAppearanceIpc();
	
	if( isFirstLaunchWithoutUserData ) {
		await reaxel_GuidingView().initGuidingView();
		return;
	}
	
	await startMainRuntime();
} ).catch( e => {
	console.error( 'App whenReady initialization failed:' , e );
	recordE2EFault( 'whenReady' , e );
} );

import { isFirstLaunchWithoutUserData } from './before-launch';
import { installE2EMainProbe } from './foundation/e2e-probe';
import { recordE2EFault } from './foundation/e2e-faults';
import { startMainRuntime } from './runtime';
import { registerAppearanceIpc } from '#main/services/appearance/ipc';
import { reaxel_GuidingView } from '#main/reaxels/Views/Guiding-View';
import { app } from 'electron';
