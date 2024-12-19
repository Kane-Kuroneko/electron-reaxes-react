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


useIPC( 'monitor-war3exe-process' ).run( ( e , data ) => {
	const { toggleWar3ProcessMonitor } = reaxel_ProcessMonitor();
	toggleWar3ProcessMonitor( data );
} );
useIPC( 'fetch-ahk_cp-status' ).run( ( e , data ) => {
	const {ahkSpawner_Store} = reaxel_AhkSpawner();
	mainWindowLoaded.then( ( win ) => {
		win.webContents.send( 'json' , {
			type : 'fetch-ahk_cp-status' ,
			data : !!ahkSpawner_Store.ahk,
		} );
	} );
} );

import { reaxel_AhkSpawner } from '#reaxels/ahk-spawner';
import { useIPC } from '#project/src/utils/useIPC.main';
import { mainWindowLoaded } from '#project/src/Main/mainWindow-loaded-promise';
import { reaxel_ProcessMonitor } from '#reaxels/process-monitor';
import { ipcMain,ipcRenderer } from 'electron';
