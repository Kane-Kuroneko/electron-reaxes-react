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

import { useIPC } from '#project/src/utils/useIPC.renderer';
import { isElectron } from '#project/src/ENV';
import type {IpcRenderer} from 'electron';
import type { IPCChannels } from '#project/src/reaxels/IPC-interfaces/channels';
