// Modules to control application life and create native browser window

logger.initialize();
process.title = "Electron-GPT";
app.whenReady().then( async () => {
	
	const win = initializeMainWindow();
	
	const BW_GoogleTranslation = new BrowserView();
	
	useBeautifulDevtool( win );
	useOpenLinkViaChrome(win);
	const proxyRules = 'http=127.0.0.1:7897;https=127.0.0.1:7897';
	const ses = win.webContents.session;
	await ses.setProxy({ proxyRules });
	
} );


app.whenReady().then( () => {
	
	const primaryDisplay = screen.getPrimaryDisplay();
	
	const scaleFactor = primaryDisplay.scaleFactor;
	
	
	// console.log( 'HDR support:' , hdrSupported );
} );

app.on( 'before-quit' , () => {
	BrowserWindow.getAllWindows()?.[0]?.destroy();
} );

// 在当前文件中你可以引入所有的主进程代码
// 也可以拆分成几个文件，然后用 require 导入。

import { useOpenLinkViaChrome } from '#generic/modify-electron/link-handler.ts';
import { initializeMainWindow,mainWindowLoaded } from './mainWindow.ts';
import logger from 'electron-log/main';
import { app , ipcMain , screen , BrowserWindow ,BrowserView} from 'electron';
import process from 'node:process';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
