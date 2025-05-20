logger.initialize();

console.log( __NODE_ENV__ );

app.whenReady().then( () => {
	
	const reax_MainProcessHub = reaxel_MainProcessHub();
	
	obsReaction( () => {
		const { recreateMainWindow , mainWindow } = reax_MainProcessHub;
		if(mainWindow){
		}else {
			recreateMainWindow({
				openDevTools : dev()
			});
		}
	} , () => [reax_MainProcessHub.mainWindow] );
	
	// mainWindow.setIcon('https://img.piclabo.xyz/2023/10/25/d67adcffb89dd.jpg')
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


import "#main/index";
import "#main/reaxels/menu";
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { initializeMainWindow } from '#main/initialize-main-window';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import { app , ipcMain , screen } from 'electron';
import {dev} from 'electron-is';
import logger from 'electron-log/main';
