export namespace NetworkProxy {
	
	export type Protocol = 'http'|'https'|'socks5';
	
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
		no_proxy_for: string[];
	});
}
