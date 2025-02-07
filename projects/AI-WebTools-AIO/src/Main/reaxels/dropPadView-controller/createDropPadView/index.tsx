
export const _createDropPadViewController = ({
	store,setState,
}:{
	store:ReturnType<typeof reaxel_DropPadController>['DropPadController_Store'],
	setState:ReturnType<typeof reaxel_DropPadController>['DropPadController_SetState'],
}) => async () : Promise<WebContentsView> => {
	const {
		absAppRunningPath,
		absAppStaticsPath,
		runInExcutable,
	} = reaxel_ElectronENV();
	const dropPadView = new WebContentsView({
		webPreferences : {
			devTools : true ,
			contextIsolation : true ,
			nodeIntegration : false,
			preload : path.join(absAppRunningPath,'preload.js') ,
			experimentalFeatures : false ,
			
		} ,
		
	});
	useBeautifulDevtool( dropPadView );
	if(runInExcutable){
		dropPadView.webContents.loadFile(path.join(absAppRunningPath,'DropPadView/index.html'));
		
	}else {
		dropPadView.webContents.loadURL( 'https://127.0.0.1:3333/DropPadView' );
	}
	
	setState( { dropPadView } );
	return dropPadView;
}

import type { reaxel_DropPadController } from '../';
import path from 'node:path';
import { reaxel_ElectronENV } from '#generic/reaxels/runtime-paths';
import { WebContentsView } from 'electron';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
