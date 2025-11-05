const defaultOptions:BrowserWindowConstructorOptions = {
	width : dev() ? 2000 :1000 ,
	height : dev() ? 1300 : 1400 ,
	webPreferences : {
		nodeIntegration: false,
		contextIsolation: true,
	} ,
};
app.disableHardwareAcceleration();
await app.whenReady();
// Create the browser window.
export const mainWindow = new BrowserWindow( _.merge({},defaultOptions));


import {xPromise} from 'reaxes-utils'
import { dev } from 'electron-is';
import {
	app ,
	BrowserWindow ,
	BrowserWindowConstructorOptions,
} from 'electron';
import _ from 'lodash';
