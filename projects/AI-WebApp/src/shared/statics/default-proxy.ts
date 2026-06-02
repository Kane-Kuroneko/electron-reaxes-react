export const DEFAULT_EXAMPLE_PROXY_SERVER_ID = 'example';

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

import type { NetworkProxy } from '#src/Types/SettingsTypes/NetworkProxy';
