export type Settings = {
	networks: {
		global_proxy : {
			proxy_mode : NetworkProxy.GlobalProxyMode;
			proxy_server_id? : string; //当proxy_mode为from_server_list时使用此字段
			user_fill_proxy? : NetworkProxy.GlobalProxy; //当proxy_mode为user_fill时使用此字段
		},
		proxy_server_list:NetworkProxy.ProxyServer.Server[],
		
	},
	AIs : AI.AIItem[],
	system : SystemSettings.Conf,
	startup : {
		aiPageLoadMode : Startup.AIPageLoadMode,
	},
	appearance : {
		darkmode : Appearance.Darkmode,
		theme : Appearance.Theme,
		language : Appearance.Language,
	},
}

export type SettingsFetchResult = Settings & {
	hasUserModifications: boolean;
}

export type SettingsApplyResult = {
	success: boolean;
	restartRequired: boolean;
	restartReasons: string[];
	applied: {
		settingsPersisted: boolean;
		aiViewsSynced: boolean;
		menuRebuilt: boolean;
		proxyUpdated: boolean;
	};
	settings?: Settings;
	error?: string;
}

import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { AI } from "#src/Types/SettingsTypes/AI";
import { SystemSettings } from "#src/Types/SettingsTypes/System";
import { Startup } from "#src/Types/SettingsTypes/Startup";
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
