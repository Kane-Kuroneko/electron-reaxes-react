// Modules to control application life and create native browser window

logger.initialize();
process.title = "AI-WebTools-AIO";
app.whenReady().then( async () => {
	
	
	
	reaxel_MainWindowHub();
	reaxel_AllocatorController();
	reaxel_DropPadController();
} );


app.whenReady().then( () => {
	
	const primaryDisplay = screen.getPrimaryDisplay();
	
	const scaleFactor = primaryDisplay.scaleFactor;
	
	
	// console.log( 'HDR support:' , hdrSupported );
} );

app.on( 'before-quit' , () => {
	BrowserWindow.getAllWindows()?.[0]?.destroy();
} );


// import './ExcutebleScripts';
import { reaxel_DropPadController } from './reaxels/dropPadView-controller';
import { reaxel_AllocatorController } from './reaxels/allocatorView-controller';
import { reaxel_MainWindowHub } from '#main/reaxels/main-window-hub';

import logger from 'electron-log/main';
import { app , ipcMain , screen , BrowserWindow , BaseWindow } from 'electron';

import process from 'node:process';

