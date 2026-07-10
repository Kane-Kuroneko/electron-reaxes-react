export type BrowserIdentityMode = 'default' | 'google-ai-studio';

export const isGoogleAIStudioURL = (url:string):boolean => {
	try {
		const { hostname } = new URL( url );
		return hostname === 'aistudio.google.com'
			|| hostname.endsWith( '.aistudio.google.com' );
	} catch {
		return url.includes( 'aistudio.google.com' );
	}
};

export const isGoogleAIStudioRelatedRequestURL = (url:string):boolean => {
	try {
		const { hostname } = new URL( url );
		return isGoogleAIStudioURL( url )
			|| hostname.includes( 'makersuite' )
			|| hostname.includes( 'alkalimakersuite' );
	} catch {
		return false;
	}
};

export const resolveBrowserIdentityMode = (domain:string):BrowserIdentityMode => {
	return isGoogleAIStudioURL( domain ) ? 'google-ai-studio' : 'default';
};

export const sanitizeElectronUserAgent = (userAgent:string):string => {
	return userAgent
		.replace( /Electron\/\S+\s?/g , '' )
		.replace( /ChatAIO\/\S+\s?/gi , '' )
		.trim();
};

export const buildChromeLikeUserAgent = (baseUserAgent:string):string => {
	const chromeVersion = extractChromeVersion( baseUserAgent );
	return `Mozilla/5.0 (${ getPlatformUserAgentToken() }) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ chromeVersion } Safari/537.36`;
};

export const resolveBrowserUserAgent = (
	baseUserAgent:string ,
	mode:BrowserIdentityMode,
):string => {
	if( mode === 'google-ai-studio' ) {
		return buildChromeLikeUserAgent( baseUserAgent );
	}
	return sanitizeElectronUserAgent( baseUserAgent );
};

export const applySessionAcceptLanguages = (ses:Session , acceptLanguages:string) => {
	updateSessionRequestHeaderState( ses , { acceptLanguages } );
};

export const applyBrowserIdentityToView = (
	view:WebContentsView ,
	domain:string ,
	acceptLanguages:string,
) => {
	const ses = view.webContents.session;
	const baseUserAgent = ses.getUserAgent();
	const mode = resolveBrowserIdentityMode( domain );
	const targetUserAgent = resolveBrowserUserAgent( baseUserAgent , mode );

	try {
		ses.setUserAgent( targetUserAgent , acceptLanguages );
		view.webContents.setUserAgent( targetUserAgent );
	} catch ( error ) {
		console.warn( '[BrowserIdentity] Failed to set user agent:' , error );
	}

	updateSessionRequestHeaderState( ses , {
		acceptLanguages ,
		mode ,
		userAgent : targetUserAgent,
	} );
};

const extractChromeVersion = (userAgent:string):string => {
	const match = userAgent.match( /Chrome\/([\d.]+)/ );
	if( match?.[1] ) {
		return match[1];
	}
	return process.versions.chrome || '131.0.0.0';
};

const getPlatformUserAgentToken = ():string => {
	if( process.platform === 'darwin' ) {
		return 'Macintosh; Intel Mac OS X 10_15_7';
	}
	if( process.platform === 'win32' ) {
		return 'Windows NT 10.0; Win64; x64';
	}
	return 'X11; Linux x86_64';
};

type SessionRequestHeaderState = {
	acceptLanguages?:string;
	mode?:BrowserIdentityMode;
	userAgent?:string;
};

const sessionRequestHeaderStateBySession = new WeakMap<Session , SessionRequestHeaderState>();
const installedSessionRequestHeaderHandlers = new WeakSet<Session>();

const updateSessionRequestHeaderState = (
	ses:Session ,
	patch:Partial<SessionRequestHeaderState>,
) => {
	const nextState = {
		...sessionRequestHeaderStateBySession.get( ses ) ,
		...patch,
	};
	sessionRequestHeaderStateBySession.set( ses , nextState );
	installSessionRequestHeaderHandler( ses );
};

const installSessionRequestHeaderHandler = (ses:Session) => {
	if( installedSessionRequestHeaderHandlers.has( ses ) ) {
		return;
	}
	installedSessionRequestHeaderHandlers.add( ses );

	ses.webRequest.onBeforeSendHeaders( ( details , callback ) => {
		const state = sessionRequestHeaderStateBySession.get( ses ) || {};
		const requestHeaders = {
			...details.requestHeaders,
		};

		if( state.acceptLanguages ) {
			requestHeaders['Accept-Language'] = state.acceptLanguages;
		}

		if( state.userAgent && state.mode ) {
			const shouldUseChromeIdentity = state.mode === 'google-ai-studio'
				|| isGoogleAIStudioRelatedRequestURL( details.url );
			if( shouldUseChromeIdentity ) {
				requestHeaders['User-Agent'] = state.userAgent;
			} else if( typeof requestHeaders['User-Agent'] === 'string' ) {
				requestHeaders['User-Agent'] = sanitizeElectronUserAgent( requestHeaders['User-Agent'] );
			}
		}

		callback( { requestHeaders } );
	} );
};

import type { Session , WebContentsView } from 'electron';
import process from 'node:process';
