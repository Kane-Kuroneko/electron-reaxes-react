export const submitSettings = (path:PatchPath<Settings>,partialSettings:PatchData<PatchPath<Settings>, Settings>) => {
	return api.submitSettings(path,partialSettings);
}

export const fetchSettings = () => {
	return api.fetchSettings();
}


import { Settings } from '#src/Types/SettingsTypes';
import {PatchData,PatchPath} from '#src/Types/SettingsTypes/SettingsPatchPath';
