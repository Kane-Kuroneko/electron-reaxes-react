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

export const resetAIsToDefaults = () => {
	return api.resetAIsToDefaults();
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


import { Settings } from '#src/Types/SettingsTypes';
import { AI } from '#src/Types/SettingsTypes/AI';
import { cloneForIPC } from '#src/shared/utils/clone-for-ipc.utility';
import { NetworkProxy } from '#src/Types/SettingsTypes/NetworkProxy';
import type { Startup } from '#src/Types/SettingsTypes/Startup';
import type { PromptView } from '#src/Types/PromptView';
import {PatchData,PatchPath} from '#src/Types/SettingsTypes/SettingsPatchPath';
