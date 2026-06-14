export namespace AI {
	
	export type AIFamily = "chatgpt"|"grok"|"gemini"|"deepseek"|"perplexity"|"claude"|"custom"|"dev-proxy-test"|"doubao"|"qianwen"|"kimi";
	
	
	export type UserFillProxy = NetworkProxy.ProxyConf;
	
	export type AIItem = {
		id:string;
		label: string;
		disabled:boolean,
		AI_family: AIFamily;
		url : string;
		url_override: string | null; // 用户自定义覆盖的URL,null表示使用AI family默认URL
		desc?: string;
		proxy_mode: NetworkProxy.AIProxyMode;
		from_server_list_proxy: string | null; //proxy_server_id
		user_fill_proxy: UserFillProxy;
		preloadOnStartup: boolean; // 是否在应用启动时预加载
	}
	
	export type EditAIItem = {
		label: AIItem['label'];
		AI_family: AIItem['AI_family'];
		url : AIItem['url'];
		url_override?: AIItem['url_override'];
		desc?: string;
		proxy_mode: NetworkProxy.AIProxyMode;
		from_server_list_proxy: string | null; //proxy_server_id
		user_fill_proxy: AIItem['user_fill_proxy'];
		preloadOnStartup: boolean; // 是否在应用启动时预加载
	}
}




import {} from './NetworkProxy';
import { NetworkProxy } from './NetworkProxy';
