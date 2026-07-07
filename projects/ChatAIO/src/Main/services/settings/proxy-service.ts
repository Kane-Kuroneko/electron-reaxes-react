export type ResolvedProxy = {
	mode: 'direct' | 'system' | 'fixed_servers';
	proxyRules?: string;
	proxyAuth?: NetworkProxy.ProxyAuthFields | null;
	source: 'ai' | 'global' | 'none' | 'system';
};

const proxyAuthHandlers = new WeakMap<WebContentsView , (...args:any[]) => void>();

const getProxyRules = (proxyConf:NetworkProxy.ProxyConfFields):string => {
	const address = `${ proxyConf.hostname }:${ proxyConf.port }`;
	return `${ proxyConf.protocol }://${ address }`;
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
	// 不显式调用 setProxy({mode:'direct'})，让 Chromium 使用默认行为（跟随系统代理配置）。
	// 若显式设置 mode:'direct'，Chromium 将绕过系统代理（如 127.0.0.1:7890），
	// 导致原始 TCP 连接中的 TLS SNI 被 GFW 检测并 RST 阻断 → ERR_CONNECTION_CLOSED。
	// 不调用 setProxy 时，Chromium 默认跟随 macOS 系统代理 → 走本地代理加密隧道 → 正常连接。
	if( resolvedProxy.mode === 'direct' ) {
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

export const testProxyConnectivity = async(
	proxyConf:NetworkProxy.ProxyConfFields ,
	url:string,
):Promise<NetworkProxy.ProxyTestResult> => {
	const startedAt = Date.now();
	let targetUrl = url;
	const controller = new AbortController();
	const timer = setTimeout( () => controller.abort() , 8000 );
	const ses = session.fromPartition( `proxy-test-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 8 ) }` );
	const normalizedProxyConf = normalizeProxyConf( proxyConf );
	const proxyAuth = getProxyAuth( normalizedProxyConf );
	const resolvedProxy = fixedProxy( normalizedProxyConf , 'global' );
	const diagnostic = createProxyTestDiagnostic( normalizedProxyConf , resolvedProxy );
	const loginHandler = (
		event:any ,
		_webContents:any ,
		_authenticationResponseDetails:any ,
		authInfo:any ,
		callback:(username?:string , password?:string) => void,
	) => {
		if(
			!authInfo?.isProxy ||
			!proxyAuth ||
			authInfo.host !== normalizedProxyConf.hostname ||
			Number( authInfo.port ) !== Number( normalizedProxyConf.port )
		) {
			return;
		}
		event.preventDefault();
		callback( proxyAuth.username , proxyAuth.password );
	};

	try {
		targetUrl = normalizeTestURL( url );
		await applyResolvedProxyToSession( ses , resolvedProxy );
		if( proxyAuth ) {
			app.on( 'login' , loginHandler );
		}
		const response = await ses.fetch( targetUrl , {
			method : 'GET' ,
			signal : controller.signal,
		} );
		const text = await response.text();
		const ipAddress = extractIPAddress( text );
		const durationMs = Date.now() - startedAt;

		if( response.status < 200 || response.status >= 400 ) {
			return {
				...diagnostic ,
				success : false ,
				url : targetUrl ,
				status : response.status ,
				durationMs ,
				error : `HTTP ${ response.status }`,
			};
		}
		if( !ipAddress ) {
			return {
				...diagnostic ,
				success : false ,
				url : targetUrl ,
				status : response.status ,
				durationMs ,
				error : 'Response did not contain an IP address',
			};
		}
		return {
			...diagnostic ,
			success : true ,
			url : targetUrl ,
			status : response.status ,
			durationMs ,
			ipAddress,
		};
	} catch ( error ) {
		return {
			...diagnostic ,
			success : false ,
			url : targetUrl ,
			durationMs : Date.now() - startedAt ,
			error : error?.message || String( error ),
		};
	} finally {
		clearTimeout( timer );
		if( proxyAuth ) {
			app.removeListener( 'login' , loginHandler );
		}
		try {
			await ses.clearCache();
			await ses.clearStorageData();
		} catch ( error ) {
			console.error( '[ProxyTest] Failed to clear test session:' , error );
		}
	}
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

const normalizeTestURL = (url:string) => {
	const trimmed = ( url || '' ).trim();
	if( !trimmed ) {
		throw new Error( 'Test URL is required' );
	}
	const parsed = new URL( trimmed );
	if( parsed.protocol !== 'http:' && parsed.protocol !== 'https:' ) {
		throw new Error( 'Only HTTP and HTTPS test URLs are supported' );
	}
	return parsed.toString();
};

const extractIPAddress = (text:string) => {
	const candidates = text.match( /[0-9a-fA-F:.]{3,}/g ) || [];
	return candidates.find( candidate => isIP( candidate.replace( /^\[|\]$/g , '' ) ) ) || null;
};

const createProxyTestDiagnostic = (
	proxyConf:NetworkProxy.ProxyConfFields ,
	resolvedProxy:ResolvedProxy,
) => {
	return {
		proxyRules : resolvedProxy.proxyRules ,
		proxyServer : `${ proxyConf.hostname }:${ proxyConf.port }` ,
		proxyProtocol : proxyConf.protocol,
	};
};

import type {
	Session ,
	WebContentsView,
} from 'electron';
import {
	app ,
	session,
} from 'electron';
import type { Settings } from '#src/Types/SettingsTypes';
import { AI } from '#src/Types/SettingsTypes/AI';
import { NetworkProxy } from '#src/Types/SettingsTypes/NetworkProxy';
import {
	normalizeGlobalProxy ,
	normalizeProxyConf,
} from '#main/services/settings/settings-config-service';
import { isIP } from 'node:net';
