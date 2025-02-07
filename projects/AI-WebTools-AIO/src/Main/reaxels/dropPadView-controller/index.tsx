export const reaxel_DropPadController = reaxel(() => {
	const {store,setState,mutate} = orzMobx({
		dropPadView : null as WebContentsView,
	})
	const reax_MainWindowHub = reaxel_MainWindowHub();
	const createDropPadViewController = _createDropPadViewController( { setState , store } );
	const resize = (win:BrowserWindow) => {
		const {width,height} = win.getContentBounds();
		store.dropPadView.setBounds( {
			x : 0 + 80 ,
			y : 0 ,
			width : width - 80 ,
			height ,
		} );
		store.dropPadView.webContents.openDevTools( { mode : 'detach' } );
	}
	obsReaction( async () => {
		const { mainWindow } = reax_MainWindowHub;
		if(mainWindow){
			const dropPadView = await createDropPadViewController();
			setState({ dropPadView });
			mainWindow.contentView.addChildView(dropPadView);
			resize(mainWindow);
		}
	} , () => [reax_MainWindowHub.mainWindow] );
	
	obsReaction(() => {
		if(reax_MainWindowHub.mainWindow){
			reax_MainWindowHub.mainWindow.on('resized' , () => {
				resize(reax_MainWindowHub.mainWindow);
			});
		}
	} , () => [reax_MainWindowHub.mainWindow]);
	
	let rtn = {
		DropPadController_Store : store,
		DropPadController_SetState : setState,
		DropPadController_Mutate : mutate,
		
	};
	return () => {
		
		return rtn;
	}
})

import { _createDropPadViewController } from './createDropPadView';
import { reaxel_MainWindowHub } from '../main-window-hub';
import {BrowserWindow, WebContentsView } from 'electron';
