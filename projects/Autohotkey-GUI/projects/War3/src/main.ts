logger.initialize();

console.log( __NODE_ENV__ );

app.whenReady().then( () => {
	
	const mainWindow = initializeMainWindow();
	
	useBeautifulDevtool( mainWindow );
	
	const {} = reaxel_AhkSpawner();
	
	// mainWindow.setIcon('https://img.piclabo.xyz/2023/10/25/d67adcffb89dd.jpg')
	
	ipcMain.on( 'json' , ( e , data ) => {
		if( data.type === 'shortcut' ) {
			console.log( 11111111111111 );
			if( data.data.type === 'keydown' && data.data.key === 'F12' ) {
				mainWindow.webContents.toggleDevTools();
			}
		}
	} );
} );


// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态, 
// 直到用户使用 Cmd + Q 明确退出
app.on( 'window-all-closed' , () => {
	if( process.platform !== 'darwin' ) app.quit();
} );


app.whenReady().then( () => {
	
	const primaryDisplay = screen.getPrimaryDisplay();
	
	const scaleFactor = primaryDisplay.scaleFactor;
	
	
	// console.log( 'HDR support:' , hdrSupported );
} );

// 在当前文件中你可以引入所有的主进程代码
// 也可以拆分成几个文件，然后用 require 导入。

import logger from 'electron-log/main';
import Electron ,{ app , BrowserWindow , globalShortcut , ipcMain , ipcRenderer , screen } from 'electron';
import path from 'path';
import Config from '../config';
import purdy from 'purdy';
import cp , { execSync } from 'child_process';
import process from 'node:process';
import { initializeMainWindow , mainWindowLoaded  } from './Main/index';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import { reaxel_AhkSpawner } from './reaxels/ahk-spawner';
