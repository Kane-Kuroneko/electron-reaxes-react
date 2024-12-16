const { runInExcutable , absAppRunningPath , absAppStaticsPath } = reaxel_ElectronENV();

mainWindowLoaded.then( ( mainWindow ) => {
	const { ahkSpawner_Store } = reaxel_AhkSpawner();
	if( ahkSpawner_Store.ahk ) {
		mainWindowLoaded.then( ( mainWindow ) => {
			mainWindow.webContents.send( 'json' , {
				type : 'ahk-cp-status' ,
				data : true ,
			} );
		} );
	}
	
	if( !runInExcutable ) {
		// 打开开发工具
		mainWindow.webContents.openDevTools();
	}
} );

import { mainWindowLoaded } from '#project/src/Main/mainWindow-loaded-promise';
import { appQuitHook } from './tray';
import { reaxel_ElectronENV } from '#reaxels/env';
import { reaxel_AhkSpawner } from '#reaxels/ahk-spawner';
