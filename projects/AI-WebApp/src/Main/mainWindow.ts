export const initializeMainWindow = (
	options:BrowserWindowConstructorOptions = {}
) => {
	// console.log('__Absolutely_ProjectDist_Path__ : ',JSON.stringify(__Absolutely_ProjectDist_Path__));
	const defaultOptions:BrowserWindowConstructorOptions = {
		width : dev() ? 2000 :1000 ,
		height : dev() ? 1300 : 1400 ,
		webPreferences : {
			nodeIntegration: false,
			contextIsolation: true,
		} ,
	};
	// Create the browser window.
	const mainWindow = new BrowserWindow( _.merge(options,defaultOptions));
	
	mainWindow.loadURL( "https://chatgpt.com" );
	
	return mainWindow;
};


// 使用 Omit 将 BrowserWindow 类型中的 webContents 排除
type BrowserWindowWithoutWebContents = Omit<BrowserWindow, 'webContents'>;
// 定义主窗口类型，给 webContents 赋予自定义的类型
export const mainWindowLoaded = xPromise<BrowserWindowWithoutWebContents>();

import {xPromise} from 'reaxes-utils'
import { dev } from 'electron-is';
import { BrowserWindow , BrowserWindowConstructorOptions } from 'electron';
import _ from 'lodash';
