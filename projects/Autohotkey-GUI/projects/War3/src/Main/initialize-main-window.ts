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

// 定义自定义的 webContents 类型，剔除掉 send 和 on 方法
type CustomWebContents = Omit<WebContents, 'send' | 'on'> & {
	send<T extends keyof Channel>(
		channel: T,
		data?: IPCChannels[T] extends any
			? any // 如果该通道类型是 any，data 就是 any
			: { type: keyof IPCChannels[T]; data: IPCChannels[T][keyof IPCChannels[T]] } | null
	): void;
	
	on<T extends keyof Channel>(
		channel: T,
		callback: (e: IpcRendererEvent, data: IPCChannels[T] extends any
			? any // 如果该通道类型是 any，data 就是 any
			: ExtractData<IPCChannels[T]>) => void
	): void;
};
// 使用 Omit 将 BrowserWindow 类型中的 webContents 排除
type BrowserWindowWithoutWebContents = Omit<BrowserWindow, 'webContents'>;
// 定义主窗口类型，给 webContents 赋予自定义的类型
export const mainWindowLoaded = orzPromise<BrowserWindowWithoutWebContents & {
	webContents: CustomWebContents;
}>();

import { IPCChannels } from '../reaxels/IPC-interfaces/channels';
import { dev } from 'electron-is';
import logger from 'electron-log/main';
import { reaxel_ElectronENV } from '#reaxels/env';
import { reaxel_AhkSpawner } from '../reaxels/ahk-spawner';
import { runtimeRootPath } from '../utils';
import { BrowserWindow , BrowserWindowConstructorOptions , app , ipcMain , WebContents } from 'electron';
import path from 'path';
import _ from 'lodash';
