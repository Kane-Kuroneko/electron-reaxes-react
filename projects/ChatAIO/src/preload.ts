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
const closePromptView = useRtm('close-prompt-view');
const previewPromptViewAppearance = useRtm('prompt-view-appearance-preview-change');
const onFloatingViewCommand = (callback:(command:FloatingView.Command) => void) => {
	return useMtr( 'floating-view-command' )( ( _ , command ) => {
		callback( command );
	} );
};
const onPromptViewAppearanceChange = (callback:(state:PromptView.AppearanceState) => void) => {
	return useMtr( 'prompt-view-appearance-change' )( ( _ , state ) => {
		callback( state );
	} );
};

// AI Configuration Management APIs
const getAIs = useRpc('get-ais');
const getDefaultAIs = useRpc('get-default-ais');
const updateAI = useRpc('update-ai');
const addAI = useRpc('add-ai');
const deleteAI = useRpc('delete-ai');
const resetAIsToDefaults = useRpc('reset-ais-to-defaults');
const getPreloadAIIds = useRpc('get-preload-ai-families'); /* 返回预加载 AI 的 ID 列表 */
const getAppearanceEnvironment = useRpc('get-appearance-environment');
const setStartupAIPageLoadMode = useRpc('set-startup-ai-page-load-mode');
const testProxyServer = useRpc('test-proxy-server');
const getGuidingDefaults = useRpc('get-guiding-defaults');
const guidingSaveProgress = useRpc('guiding-save-progress');
const guidingTestConnectivity = useRpc('guiding-test-connectivity');
const guidingFinish = useRpc('guiding-finish');
const devCleanStart = useRpc('dev-clean-start');
const getPromptViewState = useRpc('get-prompt-view-state');
const savePromptViewItems = useRpc('save-prompt-view-items');
const copyPromptViewText = useRpc('copy-prompt-view-text');
const sendPerfEvent = useRtm('perf-event');
const menuViewAction = useRtm('menu-view:action');
const menuViewReady = useRtm('menu-view:ready');
const menuViewResize = useRtm('menu-view:resize');
const onMenuViewCommand = (callback:(command:MenuView.MenuCommand) => void) => {
	return useMtr( 'menu-view:command' )( ( _ , command ) => {
		callback( command );
	} );
};
const openDropdownView = useRtm('dropdown-view:open');
const closeDropdownView = useRtm('dropdown-view:close');
const focusDropdownViewItem = useRtm('dropdown-view:focus-item');
const reportMenubarError = useRtm('menubar:error-report');
const openSettingsVersion = useRtm('open-settings-version');
const onDropdownViewCommand = (callback:(command:DropdownView.Command) => void) => {
	return useMtr( 'dropdown-view:command' )( ( _ , command ) => {
		callback( command );
	} );
};
const onUpdateStateChanged = (callback:(state:AppUpdater.State) => void) => {
	return useMtr( 'update-state-changed' )( ( _ , state ) => {
		callback( state );
	} );
};
const onSettingsViewNavigate = (callback:(payload:AppUpdater.NavigatePayload) => void) => {
	return useMtr( 'settings-view:navigate' )( ( _ , payload ) => {
		callback( payload );
	} );
};
const isDropdownVisible = (): boolean => {
	return ipcRenderer.sendSync( 'JSON_SYNC' , { channel : 'dropdown-view:is-visible' } );
};

const getAppVersion = useRpc('get-app-version');
const getUpdateState = useRpc('get-update-state');
const checkForUpdates = useRpc('check-for-updates');
const fetchVersionChangelogs = useRpc('fetch-version-changelogs');
const downloadAndInstallUpdate = useRpc('download-and-install-update');

const api = {
	fetchSettings ,
	applySettings ,
	submitSettings ,
	exitSettings,
	updatePreloadAIConfig,
	languageChange,
	turnToNextAiPage,
	turnToPreviousAiPage,
	closePromptView,
	previewPromptViewAppearance,
	onFloatingViewCommand,
	onPromptViewAppearanceChange,
	// AI Configuration Management
	getAIs,
	getDefaultAIs,
	updateAI,
	addAI,
	deleteAI,
	resetAIsToDefaults,
	getPreloadAIIds,
	getAppearanceEnvironment,
	setStartupAIPageLoadMode,
	testProxyServer,
	getGuidingDefaults,
	guidingSaveProgress,
	guidingTestConnectivity,
	guidingFinish,
	devCleanStart,
	getPromptViewState,
	savePromptViewItems,
	copyPromptViewText,
	sendPerfEvent,
	menuViewAction,
	openDropdownView,
	closeDropdownView,
	focusDropdownViewItem,
	reportMenubarError,
	openSettingsVersion,
	onDropdownViewCommand,
	onUpdateStateChanged,
	onSettingsViewNavigate,
	menuViewReady,
	menuViewResize,
	onMenuViewCommand,
	isDropdownVisible,
	getAppVersion,
	getUpdateState,
	checkForUpdates,
	fetchVersionChangelogs,
	downloadAndInstallUpdate,
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
import type { PromptView } from './Types/PromptView';
import type { MenuView } from './Types/MenuView';
import type { DropdownView } from './Types/DropdownView';
import type { AppUpdater } from './Types/AppUpdater';
