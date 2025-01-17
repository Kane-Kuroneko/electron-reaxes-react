const { runInExcutable, absAppRunningPath,absAppStaticsPath} = reaxel_ElectronENV();
//4k下的尺寸
const appAttributes = {
	width : 1800,
	height : 1800
}
const devtoolsWidth = 1366;

export const initializeMainWindow = (
	options:BrowserWindowConstructorOptions & ExtraOptions = {
		...appAttributes
	}
):BrowserWindow => {
	const defaultExtraOptions:ExtraOptions = {
		openDevTools : dev(),
	}
	
	const defaultOptions:BrowserWindowConstructorOptions = {
		webPreferences : {
			devTools : true ,
			contextIsolation : true ,
			nodeIntegration : false,
			preload : path.join(absAppRunningPath,'preload.js' ) ,
			experimentalFeatures : false ,
		} ,
		
		resizable:false,
		icon : path.join(absAppStaticsPath , 'assets/ico/logo - mixin.ico')
	};
	
	options = _.merge( {
		width : appAttributes.width,
		height : appAttributes.height,
	} , defaultExtraOptions , defaultOptions ,options );
	
	if(options.openDevTools){
		options.width += devtoolsWidth;
	}
	
	const { scaleFactor } = screen.getPrimaryDisplay();
	options.width = options.width / scaleFactor;
	options.height = options.height / scaleFactor;
	console.log( options );
	const mainWindow = new BrowserWindow( options);
	// console.log('screen.getPrimaryDisplay().scaleFactor:',screen.getPrimaryDisplay().scaleFactor);
	// 加载 index.html
	if( __NODE_ENV__ === 'development' && !runInExcutable ) {
		mainWindow.loadURL( `https://127.0.0.1:${ __DEV_PORT__ }` );
	} else {
		mainWindow.loadFile( "dist/renderer/index.html" );
	}
	
	useQuitHook( mainWindow );
	useBeautifulDevtool(mainWindow);
	
	mainWindow.webContents.on( 'did-finish-load' , () => {
		console.log( 'webkit loaded' );
		// mainWindowLoaded.resolve( mainWindow );
	} );
	if(options.openDevTools){
		mainWindow.webContents.openDevTools();
	}
	
	
	return mainWindow as BrowserWindow;
};

type ExtraOptions = Partial<{
	openDevTools : boolean,
}>

import { useQuitHook } from './useQuitHook';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { reaxel_ScreenAdapter } from '#main/reaxels/screen-adpater';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import { dev } from 'electron-is';
import { BrowserWindow , BrowserWindowConstructorOptions , app , screen } from 'electron';
import path from 'path';
