const { runInExcutable, absAppRunningPath,absAppStaticsPath} = reaxel_ElectronENV();
export const initializeMainWindow = (
	options:BrowserWindowConstructorOptions = {}
) => {
	// console.log('__Absolutely_ProjectDist_Path__ : ',JSON.stringify(__Absolutely_ProjectDist_Path__));
	const defaultOptions:BrowserWindowConstructorOptions = {
		width : dev() ? 2000 :1000 ,
		height : dev() ? 1300 : 1400 ,
		webPreferences : {
			devTools : true ,
			contextIsolation : true ,
			nodeIntegration : false,
			preload : path.join(absAppRunningPath,'preload.js' ) ,
			experimentalFeatures : false ,
		} ,
	};
	// Create the browser window.
	const mainWindow = new BrowserWindow( _.merge(options,defaultOptions));
	
	// 加载 index.html
	if( __NODE_ENV__ === 'development' && !runInExcutable ) {
		mainWindow.loadURL( `https://127.0.0.1:${ __DEV_PORT__ }` );
	} else {
		mainWindow.loadFile( "dist/renderer/index.html" );
	}
	
	// mainWindow.removeMenu();
	mainWindow.webContents.on('did-finish-load', () => {
		console.log('webkit loaded');
		mainWindowLoaded.resolve( mainWindow );
		
		const {ahkSpawner_Store,} = reaxel_AhkSpawner();
		if( ahkSpawner_Store.ahk ) {
			mainWindowLoaded.then( ( mainWindow ) => {
				mainWindow.webContents.send( 'json' , {
					type : 'ahk-cp-status' ,
					data : true,
				} );
			} );
		}
		
	});
	
	if(!runInExcutable){
		// 打开开发工具
		mainWindow.webContents.openDevTools();
	}
	return mainWindow;
};

export const mainWindowLoaded = orzPromise<BrowserWindow>();

import { dev } from 'electron-is';
import logger from 'electron-log/main';
import { reaxel_ElectronENV } from '#reaxels/env';
import { reaxel_AhkSpawner } from '../reaxels/ahk-spawner';
import { runtimeRootPath } from '../utils';
import { BrowserWindow , BrowserWindowConstructorOptions , app , ipcMain } from 'electron';
import path from 'path';
import _ from 'lodash';
