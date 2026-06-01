// When-Ready: app.whenReady()后的异步逻辑

app.whenReady().then( async() => {
	registerAppearanceIpc();
	
	if( isFirstLaunchWithoutUserData ) {
		await reaxel_GuidingView().initGuidingView();
		return;
	}
	
	await startMainRuntime();
} ).catch( e => {
	console.error( 'App whenReady initialization failed:' , e );
} );

import { isFirstLaunchWithoutUserData } from './before-launch';
import { startMainRuntime } from './runtime';
import { registerAppearanceIpc } from '#main/services/appearance/ipc';
import { reaxel_GuidingView } from '#main/reaxels/Views/Guiding-View';
import { app } from 'electron';
