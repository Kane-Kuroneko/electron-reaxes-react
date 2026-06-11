export const useIpcRpc = createIpc<IpcRpc>('rpc');
export const useIpcMainToRenderer = createIpc<MainToRendererEvents>('mtrEvent');
export const useIpcRendererToMain = createIpc<RendererToMainEvents>('rtmEvent');
export const useIpcSync = createSyncIpc<IpcSyncRpc>();

function createSyncIpc<SyncRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>>>() {
	return <Channel extends string & keyof SyncRpc>( channel: Channel ) => {
		return {
			handle(
				handler:(
					meta:{ event:IpcMainEvent } ,
					...payloads:SyncRpc[Channel]['payloads']
				) => SyncRpc[Channel]['response'],
			):{ disposer():void } {
				const disposer = registerSyncIpcHandler<SyncRpc , Channel>( channel , handler );
				return {
					disposer,
				};
			},
		};
	};
}

const registerSyncIpcHandler = function() {
	const registry:Record<string , (
		meta:{ event:IpcMainEvent } ,
		...payloads:unknown[]
	) => unknown> = {};

	ipcMain.on( 'JSON_SYNC' , ( event , meta:{ channel?:string } , ...payloads ) => {
		const channel = meta?.channel;
		if( !channel ) {
			event.returnValue = null;
			return;
		}
		const registered = registry[channel];
		if( !registered ) {
			event.returnValue = null;
			return;
		}
		try {
			event.returnValue = registered( { event } , ...payloads );
		} catch ( error ) {
			console.error( `[IPC] Sync handler failed: ${ channel }` , error );
			event.returnValue = null;
		}
	} );

	return <
		SyncRpc extends Record<string , IpcStructure.IpcRpc<unknown[] , unknown>> ,
		Channel extends string & keyof SyncRpc
	>(
		channel:Channel ,
		handler:(
			meta:{ event:IpcMainEvent } ,
			...payloads:SyncRpc[Channel]['payloads']
		) => SyncRpc[Channel]['response'],
	) => {
		if( registry[channel] ) {
			throw new Error( `sync ipc channel already registered: ${ channel }` );
		}
		registry[channel] = handler as (
			meta:{ event:IpcMainEvent } ,
			...payloads:unknown[]
		) => unknown;
		return function disposer() {
			delete registry[channel];
		};
	};
}();

import { createIpc } from '#generics/toolkit/electron/ipc.main';
import {
	IpcRpc ,
	IpcSyncRpc ,
	MainToRendererReply ,
	RendererToMainEvents ,
	MainToRendererEvents,          
} from '#src/Types/IpcSchema';
import type { IpcStructure } from '#generics/toolkit/electron/IpcStructure';
import {
	ipcMain ,
	type IpcMainEvent,
} from 'electron';
