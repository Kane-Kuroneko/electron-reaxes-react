const {absAppRunningPath} = reaxel_ElectronENV()
import {Rectangle} from 'electron';

await app.whenReady();


/**
 * 
 */
const getLogicalResolution = (
	baseLogicalWidth = 1600,   // 你设计稿的基准尺寸
	baseLogicalHeight = 900,
	position?:Rectangle,
	
) => {
	screen.getPrimaryDisplay().bounds
	const targetDisplay = position
		? screen.getDisplayNearestPoint(position)
		: screen.getPrimaryDisplay();
	const workArea = targetDisplay.workAreaSize;
	let logicalWidth = Math.min(baseLogicalWidth, Math.floor(workArea.width * 0.75));
	let logicalHeight = Math.min(baseLogicalHeight, Math.floor(workArea.height * 0.75));
	return {
		width:Math.max(1024, logicalWidth),
		height:Math.max(600, logicalHeight),
	}
}

const {width,height} = await getLogicalResolution();

const defaultOptions:BrowserWindowConstructorOptions = {
	width : dev() ? width :1280 ,
	height : dev() ? height : 720 ,
	
	
	webPreferences : {
		nodeIntegration: false,
		contextIsolation: true,
		preload: path.join(absAppRunningPath, 'preload.js'),
	} ,
};

// Create the browser window.
export const mainWindow = new BrowserWindow( _.merge({},defaultOptions));
import {xPromise} from 'reaxes-utils'


import { dev } from 'electron-is';
import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import {
	app ,
	BrowserWindow ,
	type Display,
	type BrowserWindowConstructorOptions,
	screen,
} from 'electron';
import _ from 'lodash';
import * as path from 'node:path';
