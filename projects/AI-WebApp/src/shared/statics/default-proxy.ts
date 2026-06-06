export const DEFAULT_EXAMPLE_PROXY_SERVER_ID = 'example';
export const DEFAULT_FOREIGN_PROXY_TEST_URL = 'https://api.ipify.org?format=json';
export const DEFAULT_DOMESTIC_PROXY_TEST_URL = 'https://myip.ipip.net';

export const createDefaultProxyConf = ():NetworkProxy.ProxyConfFields => ( {
	protocol : 'http' ,
	hostname : '127.0.0.1' ,
	port : 7890 ,
	proxy_auth : false,
} );

export const createDefaultGlobalProxy = ():NetworkProxy.GlobalProxyFields => ( {
	...createDefaultProxyConf() ,
	no_proxy_for : [] ,
	no_proxy_for__enabled : true,
} );

export const createDefaultProxyServers = ():NetworkProxy.ProxyServer.Server[] => [
	{
		proxy_server_id : DEFAULT_EXAMPLE_PROXY_SERVER_ID ,
		server_name : 'Example' ,
		proxy_conf : createDefaultProxyConf() ,
		enabled : false,
	},
];

export const createDefaultProxyTestURLs = ():NetworkProxy.ProxyTestURLs => ( {
	foreign : DEFAULT_FOREIGN_PROXY_TEST_URL ,
	domestic : DEFAULT_DOMESTIC_PROXY_TEST_URL,
} );

import type { NetworkProxy } from '#src/Types/SettingsTypes/NetworkProxy';
