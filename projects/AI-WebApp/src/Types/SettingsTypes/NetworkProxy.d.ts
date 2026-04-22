export namespace NetworkProxy {
	
	export type Protocol = 'http'|'https'|'socks5';
	
	export type ProxyMode = "direct"|"from_server_list"|"user_fill"|"follow_global_setting";
	
	// No Proxy For 项的类型
	export type NoProxyItemType = 'family' | 'name';
	
	// No Proxy For 单个项的结构
	export type NoProxyForItem = {
		type: NoProxyItemType;        // 'family' 或 'name'
		value: string;                 // family值或AI label值
		id: string;                    // 唯一标识符
		family: string;                // 所属的AI家族
		label?: string;                // 当type为'name'时，AI的显示名称
	};
	
	//
	export type ProxyAuthFields = {
		username: string;
		password: string;
	};
	export type ProxyAuth = false | null | ProxyAuthFields;
	
	export type ProxyConfFields = {
		hostname: string;
		port: number;
		protocol: Protocol;
		proxy_auth: ProxyAuth;
	};
	
	export type ProxyConf = false | null | ProxyConfFields;
	
	export type GlobalProxy = false | null | (ProxyConfFields & {
		no_proxy_for: NoProxyForItem[];
	});
	
	
	export namespace ProxyServer {
		export type Server = {
			proxy_server_id: string;
			server_name: string;
			proxy_conf: ProxyConfFields;
			enabled: boolean;
		};
	}
}
