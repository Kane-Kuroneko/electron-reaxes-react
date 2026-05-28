const useRpc = createIpc<IpcRpc>('rpc');
const useRtm = createIpc<RendererToMainEvents>('rtmEvent');
const useMtr = createIpc<MainToRendererEvents>('mtrEvent');


const fetchSettings = useRpc( 'fetch-settings' );
const applySettings = useRpc( 'apply-settings' );
const submitSettings = useRpc( 'submit-settings' );
const exitSettings = useRtm('exit-settings');
const updatePreloadAIConfig = useRtm('update-preload-ai-config');

// AI Configuration Management APIs
const getAIs = useRpc('get-ais');
const getDefaultAIs = useRpc('get-default-ais');
const updateAI = useRpc('update-ai');
const addAI = useRpc('add-ai');
const deleteAI = useRpc('delete-ai');
const resetAIsToDefaults = useRpc('reset-ais-to-defaults');
const getPreloadAIFamilies = useRpc('get-preload-ai-families');

const api = {
	fetchSettings ,
	applySettings ,
	submitSettings ,
	exitSettings,
	updatePreloadAIConfig,
	// AI Configuration Management
	getAIs,
	getDefaultAIs,
	updateAI,
	addAI,
	deleteAI,
	resetAIsToDefaults,
	getPreloadAIFamilies,
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
