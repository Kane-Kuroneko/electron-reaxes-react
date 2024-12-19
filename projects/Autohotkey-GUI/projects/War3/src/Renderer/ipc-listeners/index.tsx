if(isElectron){
	var { IPC } = await import('#project/src/ENV/electron')
}


IPC?.on( 'console' , ( e , data ) => {
	console.log( ...data );
} );


// IPC?.on( 'json' , ( e , json ) => {
// 	if( json.type === 'clear-localstorage' ) {
// 		localStorage.clear();
// 		location.reload();
// 		console.log( 'localstorage cleared' );
// 	}
// } );

useIPC( 'clear-localstorage' ).run( ( e , data ) => {
	localStorage.clear();
	location.reload();
} );

useIPC( 'fetch-ahk_cp-status' ).run( ( e , data ) => {
	// console.log(11111111111,data);
	crayon.orange('fetch-ahk_cp-status:  ',data)
	reaxel_GUI().GUI_SetState({switch_main : data});
} );

import { reaxel_GUI } from '#reaxels/GUI/index';
import { useIPC } from '#project/src/utils/useIPC.renderer';
import { isElectron } from '#project/src/ENV';
import type {IpcRenderer} from 'electron';
import type { IPCChannels } from '#project/src/reaxels/IPC-interfaces/channels';
