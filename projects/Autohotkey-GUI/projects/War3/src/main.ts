logger.initialize();

console.log( __NODE_ENV__ );

app.whenReady().then( () => {
	
	const mainWindow = initializeMainWindow();
	
	useBeautifulDevtool( mainWindow );
	

	
	// mainWindow.setIcon('https://img.piclabo.xyz/2023/10/25/d67adcffb89dd.jpg')
	
	ipcMain.on( 'json' , ( e , data ) => {
		if( data.type === 'shortcut' ) {
			IPCLogger( 11111111111111 );
			if( data.data.type === 'keydown' && data.data.key === 'F12' ) {
				mainWindow.webContents.toggleDevTools();
			}
		}
	} );
} );


// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态, 
// 直到用户使用 Cmd + Q 明确退出
// app.on( 'window-all-closed' , () => {
// 	if( process.platform !== 'darwin' ) app.quit();
// } );


app.whenReady().then( () => {
	
	const primaryDisplay = screen.getPrimaryDisplay();
	
	const scaleFactor = primaryDisplay.scaleFactor;
	
	
	// console.log( 'HDR support:' , hdrSupported );
} );

import "#project/src/Main/index";
import { initializeMainWindow } from '#project/src/Main/initialize-main-window';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import { app , ipcMain , screen } from 'electron';
import logger from 'electron-log/main';
