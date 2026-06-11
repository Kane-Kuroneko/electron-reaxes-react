const { absAppRunningPath } = reaxel_ElectronENV();

export let mainWindow:BrowserWindow = null;

const getLogicalResolution = (
	baseLogicalWidth = 1600,
	baseLogicalHeight = 900,
	position?:Rectangle,
) => {
	const targetDisplay = position
		? screen.getDisplayNearestPoint( position )
		: screen.getPrimaryDisplay();
	const workArea = targetDisplay.workAreaSize;
	const logicalWidth = Math.min( baseLogicalWidth , Math.floor( workArea.width * 0.75 ) );
	const logicalHeight = Math.min( baseLogicalHeight , Math.floor( workArea.height * 0.75 ) );
	return {
		width : Math.max( 1024 , logicalWidth ) ,
		height : Math.max( 600 , logicalHeight ),
	};
};

export const createMainWindow = async() => {
	if( mainWindow && !mainWindow.isDestroyed() ) {
		return mainWindow;
	}
	await app.whenReady();
	const { width , height } = getLogicalResolution();
	const defaultOptions:BrowserWindowConstructorOptions = {
		width : dev() ? width : 1280 ,
		height : dev() ? height : 720 ,
		webPreferences : {
			nodeIntegration : false ,
			contextIsolation : true ,
			preload : path.join( absAppRunningPath , 'preload.js' ),
		},
	};
	
	mainWindow = new BrowserWindow( _.merge( {} , defaultOptions ) );
	mainWindow.on( 'closed' , () => {
		mainWindow = null;
	} );
	return mainWindow;
};

export const showMainWindow = () => {
	if( !mainWindow || mainWindow.isDestroyed() ) {
		return null;
	}
	if( mainWindow.isMinimized() ) {
		mainWindow.restore();
	}
	if( !mainWindow.isVisible() ) {
		mainWindow.show();
	}
	mainWindow.focus();
	mainWindow.moveTop();
	return mainWindow;
};

import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import { dev } from 'electron-is';
import {
	app ,
	BrowserWindow ,
	type BrowserWindowConstructorOptions ,
	screen ,
	type Rectangle,
} from 'electron';
import _ from 'lodash';
import * as path from 'node:path';
