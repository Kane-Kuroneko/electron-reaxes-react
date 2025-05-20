export const reaxel_AllocatorController = reaxel(() => {
	const {
		store ,
		setState ,
		mutate ,
	} = createReaxable({
		allocatorView : null as WebContentsView ,
		viewName : 'allocator' ,
		spores : [] as ReturnType<ReturnType<typeof Refaxel_Spore>>['store'][] ,
		
	});
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
		if( reaxel_MainWindowHub.store.mainWindow ) {
			const allocatorView = await createAllocatorView();
			// store.allocatorView.webContents.openDevTools( { mode : 'detach' } );
			reaxel_MainWindowHub.store.mainWindow.contentView.addChildView(store.allocatorView);
			resize(reaxel_MainWindowHub.store.mainWindow);
		}
	} , () => [
		reaxel_MainWindowHub.store.mainWindow,
	]);
	
	obsReaction(async() => {
		if( reaxel_MainWindowHub.store.mainWindow ) {
			reaxel_MainWindowHub.store.mainWindow.on('resized' , () => {
				resize(reaxel_MainWindowHub.store.mainWindow);
			});
		}
	} , () => [
		reaxel_MainWindowHub.store.mainWindow,
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


