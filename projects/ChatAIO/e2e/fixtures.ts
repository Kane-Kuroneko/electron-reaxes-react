export type ChatAioFixtures = {
	electronApp : ElectronApplication;
	mainWindow : Page;
	userDataDir : string;
	launchMode : LaunchMode;
};

export const test = base.extend<ChatAioFixtures>( {
	launchMode : async( {} , use ) => {
		await use( 'returning-user' );
	} ,
	electronApp : async( { launchMode } , use ) => {
		const launched = await launchChatAio( { mode : launchMode } );
		let probeFaults : string[] = [];
		let persistedFaults : string[] = [];
		try {
			await use( launched.electronApp );
			probeFaults = await drainMainFaults( launched.electronApp );
		} finally {
			persistedFaults = await closeChatAio( launched );
		}
		const message = formatElectronFaults(
			[ ...probeFaults , ...persistedFaults , ...launched.rendererFaults ] ,
			launched.logs,
		);
		if( message ) {
			throw new Error( message );
		}
	} ,
	userDataDir : async( { electronApp } , use ) => {
		const dir = await electronApp.evaluate( ( { app } ) => app.getPath( 'userData' ) );
		await use( dir );
	} ,
	mainWindow : async( { electronApp , launchMode } , use ) => {
		if( launchMode === 'first-launch' ) {
			const guiding = await waitForWindowByUrl( electronApp , 'GuidingView' , 60_000 );
			await guiding.waitForLoadState( 'domcontentloaded' );
			await use( guiding );
			return;
		}
		const page = await waitForWindowByUrl( electronApp , 'MainView' , 60_000 );
		await page.waitForLoadState( 'domcontentloaded' );
		await page.getByTestId( TEST_IDS.menubar ).waitFor( {
			state : 'visible' ,
			timeout : 45_000,
		} );
		await waitForE2ESnapshot( electronApp , ( snapshot ) => snapshot.kind === 'main' , 45_000 );
		await use( page );
	},
} );

export const expect = base.expect;

export const testFirstLaunch = test.extend<ChatAioFixtures>( {
	launchMode : async( {} , use ) => {
		await use( 'first-launch' );
	},
} );

import { test as base , type ElectronApplication , type Page } from '@playwright/test';
import { closeChatAio , launchChatAio , type LaunchMode } from './support/launch';
import { drainMainFaults , waitForE2ESnapshot , waitForWindowByUrl } from './support/app-probe';
import { formatElectronFaults } from './support/faults';
import { TEST_IDS } from './support/selectors';
