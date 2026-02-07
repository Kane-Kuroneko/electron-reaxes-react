/**
 * @description rtm means renderer to main, mtr means main to renderer
 */
export function createIpc<IpcRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>>>( type: 'rpc' ): <Channel extends keyof IpcRpc>(
	channel: Channel ,
) => ( ...payloads: IpcRpc[Channel]["payloads"] ) => Promise<IpcRpc[Channel]["response"]>;
export function createIpc<RendererToMainEvent extends Record<string , IpcStructure.RendererToMainEvent<unknown[],{channel,args}>>>( type: 'rtmEvent' ): <Channel extends keyof RendererToMainEvent>(
	channel: Channel ,
) => ( ...payloads: RendererToMainEvent[Channel]["args"] ) => void;
export function createIpc<MainToRendererEvent extends Record<string , IpcStructure.MainToRendererEvent<unknown[]>>>( type: 'mtrEvent' ): <Channel extends keyof MainToRendererEvent>(
	channel: Channel ,
) => ( callback: ( event: Electron.IpcRendererEvent , ...args: MainToRendererEvent[Channel]["args"] ) => void ) => { dispose: () => void };
export function createIpc( type: 'rpc' | 'rtmEvent' | 'mtrEvent' ) {
	if( type === 'rpc' ) {
		return <IpcRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>> , Channel extends keyof IpcRpc>( channel: Channel ) =>
			( ...payloads: IpcRpc[Channel]["payloads"] ): Promise<IpcRpc[Channel]["response"]> => {
				return ipcRenderer.invoke( "JSON" , { channel } , ...payloads );
			};
	} 
	
	else if( type === 'rtmEvent' ) {
		return <RendererToMainEvent extends Record<string , IpcStructure.RendererToMainEvent<unknown[],{channel,args}>>,Channel extends keyof RendererToMainEvent>( channel: Channel ) =>
			( ...payloads: RendererToMainEvent[Channel]["args"] ) => {
				ipcRenderer.send( "JSON" ,{channel}, ...payloads );
			};
	}
	
	else if( type === 'mtrEvent' ) {
		return <MainToRendererEvent extends Record<string , IpcStructure.MainToRendererEvent<unknown[]>>,Channel extends string&keyof MainToRendererEvent>( channel: Channel ) => {
			return ( callback: ( meta:{event: Electron.IpcRendererEvent}, ...args: MainToRendererEvent[Channel]["args"] ) => void ) => {
				return useRegisterMtrEvent<Channel>(channel, callback);
			}
		}
	}
	throw new Error( `argument type must be one of 'rpc' | 'rtmEvent' | 'mtrEvent'` );
}


const {
	useRegisterMtrEvent,
} = function () {
	const registry : Record<string , Array<(
		meta:{event: Electron.IpcRendererEvent},
		...args: unknown[]
	) => void>> = {};
	
	ipcRenderer.on( "JSON" , ( event ,{channel}:{channel:keyof Record<string , IpcStructure.MainToRendererEvent<unknown[]>>}, ...args: Record<string , IpcStructure.MainToRendererEvent<unknown[]>>[typeof channel]["args"] ) => {
		const registeredList = registry[channel];
		if (!registeredList || registeredList.length === 0) {
			console.warn(`Warning: ipc mtrEvent channel '${channel}' has no listeners`);
			return;
		}
		registeredList.forEach((registered: ( meta:{event: Electron.IpcRendererEvent}, ...args: unknown[] ) => void) => {
			registered( { event }, ...args);
		});
	})
	return {
		useRegisterMtrEvent<Channel extends keyof Record<string , IpcStructure.MainToRendererEvent<unknown[]>>>( channel: Channel , callback: ( meta:{event: Electron.IpcRendererEvent} , ...args: Record<string , IpcStructure.MainToRendererEvent<unknown[]>>[Channel]["args"] ) => void ) {
			if (!registry[channel]) {
				registry[channel] = [];
			}
			registry[channel]!.push(callback);
			
			let disposed = false;
			return {
				dispose(){
					if (disposed) {throw new Error('dispose: already disposed');}
					registry[channel] = registry[channel]!.filter(cb => cb !== callback);
					disposed = true;
				}
			}
		}
	}
}();

import { IpcStructure } from "#generic/toolkit/electron/IpcStructure";
import { ipcRenderer } from "electron";
