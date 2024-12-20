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
		icon : path.join(absAppStaticsPath , 'assets/ico/logo - mixin.ico')
	};
	
	const mainWindow = new BrowserWindow( _.merge(options,defaultOptions));
	
	// 加载 index.html
	if( __NODE_ENV__ === 'development' && !runInExcutable ) {
		mainWindow.loadURL( `https://127.0.0.1:${ __DEV_PORT__ }` );
	} else {
		mainWindow.loadFile( "dist/renderer/index.html" );
	}
	useQuitHook( mainWindow );
	
	mainWindow.webContents.on( 'did-finish-load' , () => {
		console.log( 'webkit loaded' );
		mainWindowLoaded.resolve( mainWindow );
	} );
	
	return mainWindow;
};

import { mainWindowLoaded } from '#project/src/Main/mainWindow-loaded-promise';
import { useQuitHook } from './useQuitHook';
import { reaxel_ElectronENV } from '#reaxels/env';
import { dev } from 'electron-is';
import { BrowserWindow , BrowserWindowConstructorOptions } from 'electron';
import path from 'path';
import _ from 'lodash';
