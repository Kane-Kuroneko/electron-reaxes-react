const useRpc = createIpc<IpcRpc>('rpc');
const useRtm = createIpc<RendererToMainEvent>('rtmEvent');
const useMtr = createIpc<MainToRendererEvent>('mtrEvent');


const fetchSettings = useRpc( 'fetch-settings' );
const submitSettings = useRpc( 'submit-settings' );

const testMtr = useMtr('1');

const {dispose,...meta} = testMtr(({},num,str) => {
	
})

useMtr('2')((event,args) => {
	
})

const api = {
	fetchSettings ,
	submitSettings ,
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
import { version } from '#project/package.json';
import type {
	IpcRpc ,
	MainToRendererEvent ,
	RendererToMainEvent ,
} from './Types/IPC';
import { createIpc } from '#generic/toolkit/electron/preload.ipc';
