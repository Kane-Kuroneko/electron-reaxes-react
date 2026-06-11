export namespace NetworkProxy {

	export type Protocol = 'http'|'https'|'socks5';

	export type GlobalProxyMode = "direct"|"from_server_list"|"user_fill"|"use_system";

	export type AIProxyMode = "direct"|"from_server_list"|"user_fill"|"follow_global_setting";

	export type ProxyMode = GlobalProxyMode | AIProxyMode;

	export type ProxyTestTarget = 'foreign' | 'domestic';

	export type ProxyTestURLs = Record<ProxyTestTarget , string>;

	export type ProxyTestResult = {
		success: boolean;
		url: string;
		status?: number;
		durationMs: number;
		ipAddress?: string;
		error?: string;
		proxyRules?: string;
		proxyServer?: string;
		proxyProtocol?: Protocol;
	};

	// No Proxy For 项的类型
	export type NoProxyItemType = 'family' | 'name';

	// No Proxy For 单个项的结构
	export type NoProxyForItem = {
		type: NoProxyItemType;        // 'family' 或 'name'
		value: string;                 // family值或AI id
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

	export type GlobalProxyFields = ProxyConfFields & {
		no_proxy_for: NoProxyForItem[];
		no_proxy_for__enabled?: boolean;
	};

	export type GlobalProxy = false | null | GlobalProxyFields;


	export namespace ProxyServer {
		export type Server = {
			proxy_server_id: string;
			server_name: string;
			proxy_conf: ProxyConfFields;
			enabled: boolean;
		};
	}
}
