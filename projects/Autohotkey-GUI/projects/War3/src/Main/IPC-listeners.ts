mainWindowLoaded.then( ( win ) => {
	win.webContents.on( 'before-input-event' , ( event , input ) => {
		if( input.control && input.shift && input.key === 'R' ) {
			console.log( 'Ctrl+Shift+R was pressed' );
			// 在这里处理你需要执行的逻辑，比如刷新窗口
			// event.preventDefault() // 防止默认的刷新行为
			// win.webContents.localStorage.clear();
			win.webContents.send( 'json' , {
				type : 'clear-localstorage' ,
			} );
		}
	} );
	
} );

const { toggleWar3ProcessMonitor } = reaxel_ProcessMonitor();

ipcMain.on( 'json' , async( e , data ) => {
	if( data.type === 'monitor-war3exe-process' ) {
		toggleWar3ProcessMonitor(data.data);
	}
} );

import { mainWindowLoaded } from '#project/src/Main/mainWindow-loaded-promise';
import { reaxel_ProcessMonitor } from '#reaxels/process-monitor';
import { ipcMain,ipcRenderer } from 'electron';
