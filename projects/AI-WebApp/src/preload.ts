const useRpc = createIpc<IpcRpc>('rpc');
const useRtm = createIpc<RendererToMainEvents>('rtmEvent');
const useMtr = createIpc<MainToRendererEvents>('mtrEvent');


const fetchSettings = useRpc( 'fetch-settings' );
const submitSettings = useRpc( 'submit-settings' );
const exitSettings = useRtm('exit-settings');

const api = {
	fetchSettings ,
	submitSettings ,
	exitSettings,
};
export type API = typeof api;


contextBridge.exposeInMainWorld( 'api' , api );

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
} from "electron";
import type {
	IpcRpc ,
	MainToRendererEvents ,
	RendererToMainEvents ,
} from './Types/IpcSchema';
import { createIpc } from '#generics/toolkit/electron/preload.ipc';
