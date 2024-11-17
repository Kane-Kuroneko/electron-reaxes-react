

mainWindowLoaded.then( ( win ) => {
	
	
} );

const { toggleWar3ProcessMonitor } = reaxel_ProcessMonitor();
ipcMain.on( 'json' , async( e , data ) => {
	if( data.type === 'monitor-war3exe-process' ) {
		toggleWar3ProcessMonitor(data.data);
	}
} );

import { ipcMain } from 'electron';
import { mainWindowLoaded } from './initialize-main-window';
import { reaxel_ProcessMonitor } from '../reaxels/process-monitor';
