/**
 * 提交部分配置更新
 * @param path - 配置路径，如 '/networks/global_proxy/proxy_mode'
 * @param data - 该路径对应的配置数据（类型自动推导）
 * @returns Promise<{success: boolean}>
 *
 * @example
 * const {success} = await sumbitSettings('/networks/global_proxy/proxy_mode', 'direct');
 * const {success} = await sumbitSettings('/appearance/darkmode', true);
 */
export const rehancer_Ipc = ( { store , setState , mutate }: Reaxel_SettingsView ) => () => {
	
	return {
		async submitSettings ( path: PatchPath<Settings> , partialSettings: PatchData<PatchPath<Settings> , Settings> ){
			return ( await submitSettings(path , partialSettings) ).success;
		},
		async fetchSettings(){
			return await fetchSettings();
		},
		exitSettings(){
			api.exitSettings();
		}
	}
}


import {
	PatchPath ,
	PatchData ,
} from "#src/Types/SettingsTypes/SettingsPatchPath";
import { submitSettings,fetchSettings } from '#src/Views/SettingsView/services/Settings';
import { Settings } from '#src/Types/SettingsTypes';
import type {
	Reaxel_SettingsView,
} from '../index';
