IpcMainOn( 'monitor-war3exe-process' ).on( ( e , data ) => {
	const { toggleWar3ProcessMonitor } = reaxel_ProcessMonitor();
	toggleWar3ProcessMonitor( data );
} );

IpcMainOn( 'fetch-ahk_cp-status' ).on( ( e , data , reply ) => {
	const { ahkSpawner_Store } = reaxel_AhkSpawner();
	reaxel_MainProcessHub().observedMainWindow( ( win ) => {
		reply( 'fetch-ahk_cp-status').send(!!ahkSpawner_Store.ahk);
	} );
} );

IpcMainOn( 'shortcut' ).on( ( e , data ) => {
	if( data.type === 'keydown' && data.key === 'F12' ) {
		reaxel_MainProcessHub().mainWindow?.webContents.toggleDevTools();
	}
} );

IpcMainOn( 'open-url' ).on( ( e , data ) => {
	shell.openExternal( data );
} );
IpcMainOn( 'clipboard' ).on( ( e , data ) => {
	if( data.operation === 'write' ) {
		clipboard.writeText( data.value );
	} else {
		return clipboard.readText( "clipboard" );
	}
} );
IpcMainHandle( 'screen-info' ).handle( ( e , data ) => {
	return {
		primaryScreen : screen.getPrimaryDisplay()
	};
} );

import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { reaxel_AhkSpawner } from '#main/reaxels/ahk-spawner';
import { IpcMainHandle , IpcMainOn , useIpcSend } from '#main/utils/useIPC';
import { reaxel_ProcessMonitor } from '#main/reaxels/process-monitor';
import { shell , clipboard , ipcRenderer , ipcMain , screen } from 'electron';
