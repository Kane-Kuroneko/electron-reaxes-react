const {absAppRunningPath} = reaxel_ElectronENV()

const defaultOptions:BrowserWindowConstructorOptions = {
	width : dev() ? 1920 :400 ,
	height : dev() ? 1080 : 300 ,
	webPreferences : {
		nodeIntegration: false,
		contextIsolation: true,
		preload: path.join(absAppRunningPath, 'preload.js'),
	} ,
	
};

app.disableHardwareAcceleration();
await app.whenReady();
// Create the browser window.
export const mainWindow = new BrowserWindow( _.merge({},defaultOptions));
import {xPromise} from 'reaxes-utils'


import { dev } from 'electron-is';
import { reaxel_ElectronENV } from "#generic/reaxels/runtime-paths";
import {
	app ,
	BrowserWindow ,
	BrowserWindowConstructorOptions,
} from 'electron';
import _ from 'lodash';
import * as path from 'node:path';
