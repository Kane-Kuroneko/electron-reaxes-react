export const initializeMainWindow = (
	options:BrowserWindowConstructorOptions = {}
) => {
	// console.log('__Absolutely_ProjectDist_Path__ : ',JSON.stringify(__Absolutely_ProjectDist_Path__));
	const defaultOptions = {
		width : 1000 ,
		height : 1400 ,
		webPreferences : {
			devTools : true ,
			contextIsolation : true ,
			preload : path.join(__dirname,'preload.js' ) ,
			experimentalFeatures : false ,
		} ,
	};
	// Create the browser window.
	const mainWindow = new BrowserWindow( _.merge(options,defaultOptions));
	
	// 加载 index.html
	if( __NODE_ENV__ === 'development' ) {
		mainWindow.loadURL( `https://127.0.0.1:${ __DEV_PORT__ }` );
	} else {
		mainWindow.loadFile( "renderer/index.html" );
	}
	
	// mainWindow.removeMenu();
	mainWindow.webContents.on('did-finish-load', () => {
		console.log('webkit loaded');
		mainWindowLoaded.resolve( mainWindow );
		
		const {ahkSpawner_Store,} = reaxel_AhkSpawner();
		if( ahkSpawner_Store.ahk ) {
			mainWindowLoaded.then( ( mainWindow ) => {
				mainWindow.webContents.send( 'json' , {
					type : 'child_process-spawned' ,
				} );
			} );
		}
		
	});
	
	// 打开开发工具
	mainWindow.webContents.openDevTools();
	return mainWindow;
};

export const mainWindowLoaded = orzPromise<BrowserWindow>();

import { reaxel_AhkSpawner } from '../reaxels/ahk-spawner';
import { runtimeRootPath } from '../utils';
import { BrowserWindow , BrowserWindowConstructorOptions , app , ipcMain } from 'electron';
import path from 'path';
import _ from 'lodash';
