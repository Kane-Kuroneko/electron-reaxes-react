
export const _createAllocatorView = ({
	store,setState,
}:{
	store:ReturnType<typeof reaxel_AllocatorController>['AllocatorController_Store'],
	setState:ReturnType<typeof reaxel_AllocatorController>['AllocatorController_SetState'],
}) => async () : Promise<WebContentsView> => {
	const {
		absAppRunningPath,
		absAppStaticsPath,
		runInExcutable,
	} = reaxel_ElectronENV();
	const allocatorView = new WebContentsView({
		webPreferences : {
			devTools : true ,
			contextIsolation : true ,
			nodeIntegration : false,
			preload : path.join(absAppRunningPath,'preload.js') ,
			experimentalFeatures : false ,
		} ,
	});
	useBeautifulDevtool( allocatorView );
	if(runInExcutable){
		allocatorView.webContents.loadFile(path.join(absAppRunningPath,'AllocatorView/index.html'));
		
	}else {
		allocatorView.webContents.loadURL( 'https://127.0.0.1:3333/AllocatorView' );
	}
	
	setState( { allocatorView } );
	return allocatorView;
}

import type {reaxel_AllocatorController} from '../';
import path from 'node:path';
import { reaxel_ElectronENV } from '#generic/reaxels/runtime-paths';
import { WebContentsView } from 'electron';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
