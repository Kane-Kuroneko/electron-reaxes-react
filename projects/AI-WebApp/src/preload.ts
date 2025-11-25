function createIpc(type: 'rendererInvoke'): <Channel extends keyof IpcRendererInvoke>(
	channel: Channel
) => (...payloads: IpcRendererInvoke[Channel]["payloads"]) => Promise<IpcRendererInvoke[Channel]["response"]>;
function createIpc(type: 'rendererSend'): <Channel extends keyof IpcRendererSend>(
	channel: Channel
) => (...payloads: IpcRendererSend[Channel]["payloads"]) => void;
function createIpc(type: 'mainSend'): <Channel extends keyof IpcMainSend>(
	channel: Channel
) => (callback: (event: Electron.IpcRendererEvent, ...args: IpcMainSend[Channel]["response"][]) => void) => void;
function createIpc(type: 'rendererInvoke' | 'rendererSend' | 'mainSend') {
	if (type === 'rendererInvoke') {
		return <Channel extends keyof IpcRendererInvoke>(channel: Channel) =>
			(...payloads: IpcRendererInvoke[Channel]["payloads"]): Promise<IpcRendererInvoke[Channel]["response"]> =>
				ipcRenderer.invoke(channel, ...payloads);
	}
	else if (type === 'rendererSend') {
		return <Channel extends keyof IpcRendererSend>(channel: Channel) =>
			(...payloads: IpcRendererSend[Channel]["payloads"]) =>
				ipcRenderer.send(channel, ...payloads);
	}
	else if (type === 'mainSend') {
		return <Channel extends keyof IpcMainSend>(channel: Channel) =>
			(callback: (event: Electron.IpcRendererEvent, ...args: IpcMainSend[Channel]["response"][]) => void) =>
				ipcRenderer.on(channel, (event: any, ...args: any[]) => {
					return callback(event, ...args);
				});
	}
	throw new Error(`Unknown type: ${type}`);
}

const getSettings = createIpc('rendererInvoke')('get-settings');
const submitSettings = createIpc('rendererInvoke')('submit-settings');


const api = {
	getSettings,
	submitSettings,
}

export type API = typeof api;

contextBridge.exposeInMainWorld( 'api' , api );

contextBridge.exposeInMainWorld( 'IPC' , {
	send( channel , ...args ) {
		ipcRenderer.send( channel , ...args );
	} ,
	on( channel , listener ) {
		return ipcRenderer.on( channel , listener );
	} ,
	invoke( channel , ...args ) {
		return ipcRenderer.invoke( channel , ...args );
	} ,
	info : {
		app_version : version ,
	},
} );

contextBridge.exposeInMainWorld( 'versions' , {
	get node() {
		return process.versions.node;
	} ,
	get chrome() {
		return process.versions.chrome;
	} ,
	get electron() {
		return process.versions.electron;
	} ,
	
} );

import {
	contextBridge ,
	ipcRenderer ,
	IpcRenderer,
} from "electron";
import { version } from '#project/package.json';
import type {
	IpcMainSend ,
	IpcRendererSend ,
	IpcRendererInvoke,
} from './Types/IPC';
