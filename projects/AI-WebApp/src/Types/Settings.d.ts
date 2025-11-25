export namespace Settings {
	export type AISettings = {};
	
	export type ProxySettings = {
		
	}
	
	export type IpcSettings = {
		proxy: {
			enabled: boolean;
			address: string;
			type: string;
			port: number;
			hostname: string;
			no_proxy_for: string[];
			proxy_auth: {
				enabled: boolean;
				username: string;
				password: string;
			};
		},
		appearance:{
			
		},
		system:{
			
		},
		hotkeys:{},
		AIs:{
			
		}
	}
}
