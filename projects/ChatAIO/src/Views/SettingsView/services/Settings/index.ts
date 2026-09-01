export const submitSettings = (path: PatchPath<Settings>, partialSettings: PatchData<PatchPath<Settings>, Settings>) => {
	return api.submitSettings(path, partialSettings);
}

export const fetchSettings = () => {
	return api.fetchSettings();
}

export const applySettings = (settings: Settings) => {
	return api.applySettings(settings);
}

export const exitSettings = () => {
	return api.exitSettings();
}

// AI Configuration Management
export const getAIs = () => {
	return api.getAIs();
}

/** 默认页实例（main 用供应商目录 + 内置策略映射后下发），不是目录原样 */
export const getDefaultAIs = () => {
	return api.getDefaultAIs();
}

export const updateAI = (id: string, updates: Partial<AI.AIItem>) => {
	return api.updateAI(id, updates);
}

export const addAI = (ai: Omit<AI.AIItem, 'id'> & { id?: string }) => {
	return api.addAI(ai);
}

export const deleteAI = (id: string) => {
	return api.deleteAI(id);
}

export const reorderAIs = (enabledIds: string[]) => {
	return api.reorderAIs(cloneForIPC(enabledIds));
}

export const resetAIsToDefaults = () => {
	return api.resetAIsToDefaults();
}

export const checkAiCatalogUpdate = () => {
	return api.checkAiCatalogUpdate();
}

export const applyAiCatalogUpdate = ( revision:number ) => {
	return api.applyAiCatalogUpdate( revision );
}

export const discardAiCatalogUpdate = () => {
	return api.discardAiCatalogUpdate();
}

export const relaunchApp = () => {
	return api.relaunchApp();
}

export const getPreloadAIIds = () => {
	return api.getPreloadAIIds();
}

/** @deprecated 使用 getPreloadAIIds() 替代 */
export const getPreloadAIFamilies = () => {
	return api.getPreloadAIIds();
}

export const getAppearanceEnvironment = () => {
	return api.getAppearanceEnvironment();
}

export const previewPromptViewAppearance = (appearance: PromptView.Appearance) => {
	return api.previewPromptViewAppearance(cloneForIPC(appearance));
}

export const setStartupAIPageLoadMode = (mode: Startup.AIPageLoadMode) => {
	return api.setStartupAIPageLoadMode(mode);
}

export const testProxyServer = (proxyConf: NetworkProxy.ProxyConfFields, url: string) => {
	return api.testProxyServer(cloneForIPC(proxyConf), url);
}

export const turnToNextAiPage = () => {
	return api.turnToNextAiPage();
}

export const turnToPreviousAiPage = () => {
	return api.turnToPreviousAiPage();
}

export const devCleanStart = () => {
	return api.devCleanStart();
}

export const sendPerfEvent = ( events:PerfEvent[] ) => {
	return api.sendPerfEvent( events );
}


import { Settings } from '#src/Types/SettingsTypes';
import { AI } from '#src/Types/SettingsTypes/AI';
import { cloneForIPC } from '#shared/utils/clone-for-ipc.utility';
import type { PerfEvent } from '#shared/utils/switch-perf-recorder.utility';
import { NetworkProxy } from '#src/Types/SettingsTypes/NetworkProxy';
import type { Startup } from '#src/Types/SettingsTypes/Startup';
import type { PromptView } from '#src/Types/PromptView';
import {PatchData,PatchPath} from '#src/Types/SettingsTypes/SettingsPatchPath';
