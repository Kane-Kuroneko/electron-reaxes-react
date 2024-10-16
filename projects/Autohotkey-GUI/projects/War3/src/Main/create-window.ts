export const createWindow = (
	options:BrowserWindowConstructorOptions = {}
) => {
	const defaultOptions = {
		width : 2400 ,
		height : 1080 ,
		webPreferences : {
			devTools : true ,
			contextIsolation : true ,
			preload : path.resolve(__Absolutely_ProjectDist_Path__,'preload.js' ) ,
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
	
	
	// 打开开发工具
	mainWindow.webContents.openDevTools();
	return mainWindow;
};

// export const mainWindow = createWindow();
import {} from '#project/src/preload';


import { BrowserWindow , BrowserWindowConstructorOptions , app } from 'electron';
import path from 'path';
import _ from 'lodash';
