if( isElectron ) {
	var { IPC } = await import('#project/src/ENV/electron');
}


export const useIPC = <T extends IPCChannels['json']['type']>( type: T ) => {
	type MatchedType = Extract<IPCChannels['json'] , { type: T }>;
	type V = MatchedType extends { data: infer P } ? P : never;
	return {
		run<C extends ( e?: IpcRenderer , data?: V ) => void>( cb: C ) {
			
			if(!IPC){
				return;
			}
			
			IPC.on( 'json' , ( e , json ) => {
				if(json.type !== type){
					return;
				}
				cb( e , json.data as V );
			} );
		},
	};
};

import type { IpcRenderer } from 'electron';
import type { IPCChannels } from '#project/src/reaxels/IPC-interfaces/channels';
import { isElectron } from '#project/src/ENV';
