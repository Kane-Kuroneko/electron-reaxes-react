export const reaxel_AllocatorController = reaxel(() => {
	const {
		store ,
		setState ,
		mutate ,
	} = orzMobx({
		allocatorView : null as WebContentsView ,
		viewName : 'allocator' ,
		spores : [] as ReturnType<ReturnType<typeof Refaxel_Spore>>['store'][] ,
		
	});
	const reax_MainWindowHub = reaxel_MainWindowHub();
	const createAllocatorView = _createAllocatorView({ store , setState });
	const resize = ( win: BrowserWindow  ) => {
		const { height } = win.getContentBounds();
		store.allocatorView.setBounds({
			x : 0 ,
			y : 0 ,
			width : 80 ,
			height ,
		});
	};
	obsReaction(async() => {
		if( reax_MainWindowHub.mainWindow ) {
			const allocatorView = await createAllocatorView();
			// store.allocatorView.webContents.openDevTools( { mode : 'detach' } );
			reax_MainWindowHub.mainWindow.contentView.addChildView(store.allocatorView);
			resize(reax_MainWindowHub.mainWindow);
		}
	} , () => [
		reax_MainWindowHub.mainWindow,
	]);
	
	obsReaction(async() => {
		if( reax_MainWindowHub.mainWindow ) {
			reax_MainWindowHub.mainWindow.on('resized' , () => {
				resize(reax_MainWindowHub.mainWindow);
			});
		}
	} , () => [
		reax_MainWindowHub.mainWindow,
	]);
	
	const rtn = {
		AllocatorController_Store : store ,
		AllocatorController_SetState : setState ,
		AllocatorController_Mutate : mutate ,
		createAllocatorView ,
		
	};
	return () => {
		
		return rtn;
	};
});

import type { Refaxel_Spore } from '#main/refaxels/Spore';
import { _createAllocatorView } from './createAllocatorView';
import { reaxel_MainWindowHub } from '../main-window-hub';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import type { WebContentsView , BrowserWindow } from 'electron';


