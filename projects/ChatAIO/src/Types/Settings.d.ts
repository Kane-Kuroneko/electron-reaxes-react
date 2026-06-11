export namespace Settings {
	export type AISettings = {};
	
	export type ProxySettings = {
		
	}
	
	//用于IPC传输的settings结构
	export type IpcSettings = {
		proxy: NetworkProxy.GlobalProxy,
		appearance:{
			
		},
		system:{
			
		},
		hotkeys:{},
		AIs:{
			
		}
	}
	
	//持久化在硬盘上的用户设置,前后端共用
	export type PersistedSettings = {
		networks: SharedSettings['networks'],
		system: SharedSettings['system'],
		startup: SharedSettings['startup'],
		appearance: SharedSettings['appearance'],
		AIs : AI.AIItem[],
	}
}

import type { NetworkProxy } from './SettingsTypes/NetworkProxy';
import type { AI } from './SettingsTypes/AI';
import type { Settings as SharedSettings } from './SettingsTypes';
