export const submitSettings = (path: PatchPath<Settings>, partialSettings: PatchData<PatchPath<Settings>, Settings>) => {
	return api.submitSettings(path, partialSettings);
}

export const fetchSettings = () => {
	return api.fetchSettings();
}

export const applySettings = (settings: Settings) => {
	return api.applySettings(settings);
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

export const getPreloadAIFamilies = () => {
	return api.getPreloadAIFamilies();
}

export const turnToNextAiPage = () => {
	return api.turnToNextAiPage();
}

export const turnToPreviousAiPage = () => {
	return api.turnToPreviousAiPage();
}

export const getAppearanceEnvironment = () => {
	return api.getAppearanceEnvironment();
}

export const createSettingsIpcService = () => {
	return {
		async submitSettings ( path: PatchPath<Settings> , partialSettings: PatchData<PatchPath<Settings> , Settings> ){
			return ( await submitSettings(path , partialSettings) ).success;
		},
		fetchSettings,
		applySettings,
		exitSettings(){
			api.exitSettings();
		},
		getAIs,
		getDefaultAIs,
		updateAI,
		addAI,
		deleteAI,
		resetAIsToDefaults,
		getPreloadAIFamilies,
		turnToNextAiPage,
		turnToPreviousAiPage,
		getAppearanceEnvironment,
	};
};


import { Settings } from '#src/Types/SettingsTypes';
import { AI } from '#src/Types/SettingsTypes/AI';
import {PatchData,PatchPath} from '#src/Types/SettingsTypes/SettingsPatchPath';
