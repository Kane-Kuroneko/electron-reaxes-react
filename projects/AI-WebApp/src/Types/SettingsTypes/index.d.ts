export type Settings = {
	networks: {
		global_proxy : {
			proxy_mode : NetworkProxy.ProxyMode;
			proxy_server_id? : string; //当proxy_mode为from_server_list时使用此字段
			user_fill_proxy? : { //当proxy_mode为user_fill时使用此字段
				hostname : string;
				port : number;
				protocol : NetworkProxy.Protocol;
				proxy_auth : NetworkProxy.ProxyAuth;
			}
		},
		proxy_server_list:NetworkProxy.ProxyServer.Server[],
		
	},
	AIs : AI.AIItem[],
	system : SystemSettings.Conf,
	appearance : {
		darkmode : Appearance.Darkmode,
		language : Appearance.Language,
	},
}
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { AI } from "#src/Types/SettingsTypes/AI";
import { SystemSettings } from "#src/Types/SettingsTypes/System";
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
