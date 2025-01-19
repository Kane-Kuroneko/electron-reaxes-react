export const reaxel_MainProcessHub = reaxel( () => {
	const { store , setState , mutate } = orzMobx( {
		mainWindow : null as BrowserWindow ,
	} );
	
	const obsCallbacks = [];
	
	const observedMainWindow = ( cb: ( win: BrowserWindow ) => any ) => {
		obsReaction( () => {
			if( store.mainWindow ) {
				cb( store.mainWindow );
			}
		} , () => [ store.mainWindow ] );
	};
	
	const recreateMainWindow = ( options = {
		
	} ) => {
		if( store.mainWindow ) {
			store.mainWindow.destroy();
			setState( { mainWindow : null } );
		}
		const newWindow = initializeMainWindow().then((mainWindow) => {
			setState( { mainWindow } );
		});
		return newWindow;
	};
	
	const ret = {
		MainProcessHub_Store : store ,
		MainProcessHub_SetState : setState ,
		MainProcessHub_Mutate : mutate ,
		observedMainWindow ,
		recreateMainWindow ,
		get mainWindow() {
			return store.mainWindow;
		} ,
	};
	
	return () => {
		
		return ret;
	};
} );


import { initializeMainWindow } from '#main/initialize-main-window';
import { dev } from 'electron-is';
import type { BrowserWindow , WebContents } from 'electron';
