export namespace AI {
	
	export type AIFamily = "chatgpt"|"grok"|"gemini"|"deepseek"|"perplexity"|"dev-proxy-test";
	
	
	export type UserFillProxy = NetworkProxy.ProxyConf;
	
	export type AIItem = {
		id:string;
		label: string;
		disabled:boolean,
		AI_family: AIFamily;
		url : string;
		desc?: string;
		proxy_mode: NetworkProxy.ProxyMode;
		from_server_list_proxy: string; //proxy_server_id
		user_fill_proxy: UserFillProxy;
		preloadOnStartup: boolean; // 是否在应用启动时预加载
	}
	
	export type EditAIItem = {
		label: AIItem['label'];
		AI_family: AIItem['AI_family'];
		url : AIItem['url'];
		desc?: string;
		proxy_mode: NetworkProxy.ProxyMode;
		from_server_list_proxy: string; //proxy_server_id
		user_fill_proxy: AIItem['user_fill_proxy'];
		preloadOnStartup: boolean; // 是否在应用启动时预加载
	}
}




import {} from './NetworkProxy';
import { NetworkProxy } from './NetworkProxy';
