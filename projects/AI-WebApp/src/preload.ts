const useRpc = createIpc<IpcRpc>('rpc');
const useRtm = createIpc<RendererToMainEvents>('rtmEvent');
const useMtr = createIpc<MainToRendererEvents>('mtrEvent');


const fetchSettings = useRpc( 'fetch-settings' );
const applySettings = useRpc( 'apply-settings' );
const submitSettings = useRpc( 'submit-settings' );
const exitSettings = useRtm('exit-settings');
const updatePreloadAIConfig = useRtm('update-preload-ai-config');
const languageChange = useRtm('language-change');
const turnToNextAiPage = useRtm('turn-to-next-ai-page');
const turnToPreviousAiPage = useRtm('turn-to-previous-ai-page');
const onFloatingViewCommand = (callback:(command:FloatingView.Command) => void) => {
	return useMtr( 'floating-view-command' )( ( _ , command ) => {
		callback( command );
	} );
};

// AI Configuration Management APIs
const getAIs = useRpc('get-ais');
const getDefaultAIs = useRpc('get-default-ais');
const updateAI = useRpc('update-ai');
const addAI = useRpc('add-ai');
const deleteAI = useRpc('delete-ai');
const resetAIsToDefaults = useRpc('reset-ais-to-defaults');
const getPreloadAIFamilies = useRpc('get-preload-ai-families');
const getAppearanceEnvironment = useRpc('get-appearance-environment');
const setStartupAIPageLoadMode = useRpc('set-startup-ai-page-load-mode');
const testProxyServer = useRpc('test-proxy-server');
const getGuidingDefaults = useRpc('get-guiding-defaults');
const guidingSaveProgress = useRpc('guiding-save-progress');
const guidingTestConnectivity = useRpc('guiding-test-connectivity');
const guidingFinish = useRpc('guiding-finish');
const devCleanStart = useRpc('dev-clean-start');

const api = {
	fetchSettings ,
	applySettings ,
	submitSettings ,
	exitSettings,
	updatePreloadAIConfig,
	languageChange,
	turnToNextAiPage,
	turnToPreviousAiPage,
	onFloatingViewCommand,
	// AI Configuration Management
	getAIs,
	getDefaultAIs,
	updateAI,
	addAI,
	deleteAI,
	resetAIsToDefaults,
	getPreloadAIFamilies,
	getAppearanceEnvironment,
	setStartupAIPageLoadMode,
	testProxyServer,
	getGuidingDefaults,
	guidingSaveProgress,
	guidingTestConnectivity,
	guidingFinish,
	devCleanStart,
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
import type { FloatingView } from './Types/FloatingView';
