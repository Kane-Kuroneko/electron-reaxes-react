export const useIPC = <T extends IPCChannels['json']['type']>( type: T ) => {
	type MatchedType = Extract<IPCChannels['json'] , { type: T }>;
	type V = MatchedType extends { data: infer P } ? P : never;
	return {
		run<C extends ( e?: IpcMainEvent , data?: V ) => void>( cb: C ) {
			
			ipcMain.on( 'json' , ( e , json ) => {
				if(json.type !== type){
					return;
				}
				cb( e , json.data as V );
			} );
		} ,
	};
};

import type { IPCChannels } from '#project/src/reaxels/IPC-interfaces/channels';
import { isElectron } from '#project/src/ENV';
import { ipcMain , IpcMainEvent } from 'electron';
