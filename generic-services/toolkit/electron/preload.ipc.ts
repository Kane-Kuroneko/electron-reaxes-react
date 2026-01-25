/**
 * @description rtm means renderer to main, mtr means main to renderer
 */
import { IpcStructure } from "#generic/toolkit/electron/IpcStructure";
import { ipcRenderer } from "electron";

export function createIpc<IpcRpc extends Record<string , IpcStructure.IpcRpc<any[] , any>>>( type: 'rpc' ): <Channel extends keyof IpcRpc>(
	channel: Channel ,
) => ( ...payloads: IpcRpc[Channel]["payloads"] ) => Promise<IpcRpc[Channel]["response"]>;
export function createIpc<RendererToMainEvent extends Record<string , IpcStructure.RendererToMainEvent<any[],any[]>>>( type: 'rtmEvent' ): <Channel extends keyof RendererToMainEvent>(
	channel: Channel ,
) => ( ...payloads: RendererToMainEvent[Channel]["args"] ) => void;
export function createIpc<MainToRendererEvent extends Record<string , IpcStructure.MainToRendererEvent<any[],any[]>>>( type: 'mtrEvent' ): <Channel extends keyof MainToRendererEvent>(
	channel: Channel ,
) => ( callback: ( event: Electron.IpcRendererEvent , ...args: MainToRendererEvent[Channel]["args"] ) => void ) => { dispose: () => void };
export function createIpc( type: 'rpc' | 'rtmEvent' | 'mtrEvent' ) {
	if( type === 'rpc' ) {
		return <IpcRpc extends Record<string , IpcStructure.IpcRpc<any[] , any>>,Channel extends keyof IpcRpc>( channel: Channel ) =>
			( ...payloads: IpcRpc[Channel]["payloads"] ): Promise<IpcRpc[Channel]["response"]> =>
				ipcRenderer.invoke( "JSON" ,{channel}, ...payloads );
	} 
	else if( type === 'rtmEvent' ) {
		return <RendererToMainEvent extends Record<string , IpcStructure.RendererToMainEvent<any[],any[]>>,Channel extends keyof RendererToMainEvent>( channel: Channel ) =>
			( ...payloads: RendererToMainEvent[Channel]["args"] ) => {
				ipcRenderer.send( "JSON" ,{channel}, ...payloads );
			};
	} 
	else if( type === 'mtrEvent' ) {
		return <MainToRendererEvent extends Record<string , IpcStructure.MainToRendererEvent<any[],any[]>>,Channel extends string&keyof MainToRendererEvent>( channel: Channel ) => {
			return ( callback: ( event: Electron.IpcRendererEvent, ...args: MainToRendererEvent[Channel]["args"] ) => void ) => {
				return useRegisterMtrEvent<Channel>(channel, callback);
			}
		}
	}
	throw new Error( `Unknown type: ${ type }` );
}

const {
	useRegisterMtrEvent,
} = function () {
	const registry : {
		[channel in keyof Record<string , IpcStructure.MainToRendererEvent<any[],any>>]?: ( ( event: Electron.IpcRendererEvent , ...args: Record<string , IpcStructure.MainToRendererEvent<any[],any>>[channel]["args"] ) => void )[]
	} = {};
	
	ipcRenderer.on( "JSON" , ( event ,{channel}:{channel:keyof Record<string , IpcStructure.MainToRendererEvent<any[],any>>}, ...args: Record<string , IpcStructure.MainToRendererEvent<any[],any>>[typeof channel]["args"] ) => {
		const callbacks = registry[channel];
		if (!callbacks || callbacks.length === 0) {
			console.warn(`Warning: ipc mtrEvent channel '${channel}' has no listeners`);
			return;
		}
		callbacks.forEach((callback: ( event: Electron.IpcRendererEvent , ...args: Record<string , IpcStructure.MainToRendererEvent<any[],any>>[typeof channel]["args"] ) => void) => {
			callback(event, ...args);
		});
	})
	return {
		useRegisterMtrEvent<Channel extends keyof Record<string , IpcStructure.MainToRendererEvent<any[],any>>>( channel: Channel , callback: ( event: Electron.IpcRendererEvent , ...args: Record<string , IpcStructure.MainToRendererEvent<any[],any>>[Channel]["args"] ) => void ) {
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
