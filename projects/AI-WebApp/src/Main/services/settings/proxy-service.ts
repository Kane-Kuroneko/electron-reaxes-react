export type ResolvedProxy = {
	mode: 'direct' | 'system' | 'fixed_servers';
	proxyRules?: string;
	proxyAuth?: NetworkProxy.ProxyAuthFields | null;
	source: 'ai' | 'global' | 'none' | 'system';
};

const proxyAuthHandlers = new WeakMap<WebContentsView , (...args:any[]) => void>();

const getProxyRules = (proxyConf:NetworkProxy.ProxyConfFields):string => {
	const address = `${ proxyConf.hostname }:${ proxyConf.port }`;
	if( proxyConf.protocol === 'socks5' ) {
		return `socks5://${ address }`;
	}
	return `http=${ address };https=${ address }`;
};

const getProxyAuth = (proxyConf:NetworkProxy.ProxyConfFields):NetworkProxy.ProxyAuthFields | null => {
	return proxyConf.proxy_auth && typeof proxyConf.proxy_auth === 'object'
		? proxyConf.proxy_auth
		: null;
};

const fixedProxy = (proxyConf:NetworkProxy.ProxyConfFields , source:ResolvedProxy['source']):ResolvedProxy => ( {
	mode : 'fixed_servers' ,
	proxyRules : getProxyRules( proxyConf ) ,
	proxyAuth : getProxyAuth( proxyConf ) ,
	source,
} );

const directProxy = ():ResolvedProxy => ( {
	mode : 'direct' ,
	source : 'none',
} );

const systemProxy = ():ResolvedProxy => ( {
	mode : 'system' ,
	source : 'system',
} );

const findEnabledProxyServer = (
	settings:Pick<Settings , 'networks'> ,
	proxyServerId:string | null | undefined,
) => {
	return settings.networks.proxy_server_list.find( server => {
		return server.enabled !== false && server.proxy_server_id === proxyServerId;
	} );
};

const globalBypassMatchesAI = (ai:AI.AIItem , globalProxy:NetworkProxy.GlobalProxy):boolean => {
	if( !globalProxy || globalProxy.no_proxy_for__enabled === false ) {
		return false;
	}
	return ( globalProxy.no_proxy_for || [] ).some( item => {
		if( item.type === 'family' ) {
			return item.family === ai.AI_family || item.value === ai.AI_family;
		}
		return item.value === ai.id || item.value === ai.label || item.label === ai.label;
	} );
};

export const resolveGlobalProxy = (settings:Pick<Settings , 'networks'>):ResolvedProxy => {
	const globalProxy = settings.networks.global_proxy;
	
	switch( globalProxy.proxy_mode ) {
		case 'direct':
			return directProxy();
		case 'use_system':
			return systemProxy();
		case 'from_server_list': {
			const proxyServer = findEnabledProxyServer( settings , globalProxy.proxy_server_id );
			return proxyServer ? fixedProxy( proxyServer.proxy_conf , 'global' ) : directProxy();
		}
		case 'user_fill':
		default:
			return globalProxy.user_fill_proxy
				? fixedProxy( normalizeGlobalProxy( globalProxy.user_fill_proxy ) , 'global' )
				: directProxy();
	}
};

export const resolveAIProxy = (ai:AI.AIItem , settings:Pick<Settings , 'networks'>):ResolvedProxy => {
	switch( ai.proxy_mode ) {
		case 'direct':
			return directProxy();
		case 'from_server_list': {
			const proxyServer = findEnabledProxyServer( settings , ai.from_server_list_proxy );
			return proxyServer ? fixedProxy( proxyServer.proxy_conf , 'ai' ) : directProxy();
		}
		case 'user_fill':
			return ai.user_fill_proxy ? fixedProxy( normalizeProxyConf( ai.user_fill_proxy ) , 'ai' ) : directProxy();
		case 'follow_global_setting':
		default: {
			if( globalBypassMatchesAI( ai , settings.networks.global_proxy.user_fill_proxy ) ) {
				return directProxy();
			}
			return resolveGlobalProxy( settings );
		}
	}
};

export const applyResolvedProxyToSession = async( ses:Session , resolvedProxy:ResolvedProxy ) => {
	if( resolvedProxy.mode === 'fixed_servers' ) {
		await ses.setProxy( {
			mode : 'fixed_servers' ,
			proxyRules : resolvedProxy.proxyRules,
		} );
		return;
	}
	await ses.setProxy( {
		mode : resolvedProxy.mode,
	} );
};

export const applyAIProxyToView = async(
	view:WebContentsView ,
	ai:AI.AIItem ,
	settings:Pick<Settings , 'networks'>,
) => {
	const resolvedProxy = resolveAIProxy( ai , settings );
	await applyResolvedProxyToSession( view.webContents.session , resolvedProxy );
	installProxyAuthHandler( view , resolvedProxy );
	return resolvedProxy;
};

const installProxyAuthHandler = (view:WebContentsView , resolvedProxy:ResolvedProxy) => {
	const previousHandler = proxyAuthHandlers.get( view );
	if( previousHandler ) {
		view.webContents.removeListener( 'login' , previousHandler );
		proxyAuthHandlers.delete( view );
	}
	if( !resolvedProxy.proxyAuth ) {
		return;
	}
	const handler = (
		event:any ,
		_details:any ,
		authInfo:any ,
		callback:(username?:string , password?:string) => void,
	) => {
		if( !authInfo?.isProxy || !resolvedProxy.proxyAuth ) {
			return;
		}
		event.preventDefault();
		callback( resolvedProxy.proxyAuth.username , resolvedProxy.proxyAuth.password );
	};
	view.webContents.on( 'login' , handler );
	proxyAuthHandlers.set( view , handler );
};

import type {
	Session ,
	WebContentsView,
} from 'electron';
import type { Settings } from '#src/Types/SettingsTypes';
import { AI } from '#src/Types/SettingsTypes/AI';
import { NetworkProxy } from '#src/Types/SettingsTypes/NetworkProxy';
import {
	normalizeGlobalProxy ,
	normalizeProxyConf,
} from '#main/services/settings/settings-config-service';
