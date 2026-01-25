import {
	PatchPath,
	PatchData,
	
} from "#src/Types/SettingsTypes/SettingsPatchPath";
import { Settings } from '#src/Types/SettingsTypes';
import type {
	Reaxel_SettingsView,
} from '../index';

export const rehancer_Dev = ({store,setState,mutate}:Reaxel_SettingsView) => () => {
	
}
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
const sumbitSettings = <P extends PatchPath<Settings>>(
	path: P,
	data: PatchData<P, Settings>
): Promise<{success: boolean}> => {
	// 调用 api.submitSettings，传递 [path, data] 对
	// IPC 会根据 Tuple<[PatchPath<Config>, PatchData<...>], {success: boolean}> 自动扩展参数
	return api.submitSettings(path, data);
}
