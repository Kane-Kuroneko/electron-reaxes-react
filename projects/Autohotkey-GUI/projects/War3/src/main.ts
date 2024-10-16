// Modules to control application life and create native browser window
import { app , BrowserWindow , globalShortcut , ipcMain , ipcRenderer , screen } from 'electron';
import path from 'path';
import Config from '../config';
import purdy from 'purdy';
import process,{ execSync } from 'child_process';
import { createWindow } from './Main/index';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';


console.log(__NODE_ENV__);

app.whenReady().then(() => {
	
	const mainWindow = createWindow();
	useBeautifulDevtool(mainWindow);
})


ipcMain.on( 'test' , ( event , data ) => {
	// purdy(data);
} );

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态, 
// 直到用户使用 Cmd + Q 明确退出
app.on( 'window-all-closed' , () => {
	if( process.platform !== 'darwin' ) app.quit();
} );


app.whenReady().then( () => {
	process.exec('chcp 65001', (error, stdout, stderr) => {
		if (error) {
			console.error(`Error setting console encoding: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`stderr: ${stderr}`);
			return;
		}
		console.log(`stdout: ${stdout}`);
		console.log('控制台中文测试: 确认是否有效');
	});
	const primaryDisplay = screen.getPrimaryDisplay();
	
	const scaleFactor = primaryDisplay.scaleFactor;
	
	console.log( `少しずつ少しずつ少しずつ: ${ scaleFactor }` );
	
	console.log('阿斯达大师大师大大');
	// console.log( 'HDR support:' , hdrSupported );
} );

// 在当前文件中你可以引入所有的主进程代码
// 也可以拆分成几个文件，然后用 require 导入。
