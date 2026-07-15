export type BrowserIdentityMode = 'default' | 'google-ai-studio';

export type BrowserIdentityState = {
	mode:BrowserIdentityMode;
	userAgent:string;
};

/**
 * AI Studio uses a separate MakerSuite control-plane. It has stricter checks than
 * standard Google OAuth, but that does not mean we should spoof a full Chrome
 * fingerprint here — mismatched UA / Client Hints is a stronger rejection signal.
 */
export const isGoogleAIStudioURL = (url:string):boolean => {
	try {
		const { hostname } = new URL( url );
		return hostname === 'aistudio.google.com'
			|| hostname.endsWith( '.aistudio.google.com' );
	} catch {
		return url.includes( 'aistudio.google.com' );
	}
};

export const isGooglePropertyURL = (url:string):boolean => {
	try {
		const { hostname } = new URL( url );
		return hostname === 'google.com'
			|| hostname.endsWith( '.google.com' );
	} catch {
		return url.includes( 'google.com' );
	}
};

export const isGoogleAuthURL = (url:string):boolean => {
	try {
		const { hostname , pathname } = new URL( url );
		if( hostname === 'accounts.google.com' || hostname.endsWith( '.accounts.google.com' ) ) {
			return true;
		}
		if( hostname === 'myaccount.google.com' ) {
			return true;
		}
		if( hostname === 'google.com' && pathname.startsWith( '/accounts' ) ) {
			return true;
		}
		return false;
	} catch {
		return url.includes( 'accounts.google.com' );
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

export const shouldOpenGoogleAuthInCurrentView = (currentURL:string , nextURL:string):boolean => {
	if( !isGooglePropertyURL( currentURL ) ) {
		return false;
	}
	return isGoogleAuthURL( nextURL ) || isGooglePropertyURL( nextURL );
};

export const resolveBrowserIdentityMode = (domain:string):BrowserIdentityMode => {
	return isGoogleAIStudioURL( domain ) ? 'google-ai-studio' : 'default';
};

export const sanitizeElectronUserAgent = (userAgent:string):string => {
	return userAgent
		.replace( /\s*Electron\/\S+/g , '' )
		.replace( /\s*ChatAIO\/\S+/gi , '' )
		.trim();
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

const buildChromeLikeUserAgent = (baseUserAgent:string):string => {
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

export const applyGlobalBrowserIdentityFallback = () => {
	app.userAgentFallback = sanitizeElectronUserAgent( app.userAgentFallback );
};

export const applySessionAcceptLanguages = (ses:Session , acceptLanguages:string) => {
	updateSessionRequestHeaderState( ses , { acceptLanguages } );
};

export const resolveBrowserIdentityState = (
	domain:string ,
	baseUserAgent:string,
):BrowserIdentityState => {
	const mode = resolveBrowserIdentityMode( domain );
	return {
		mode ,
		userAgent : resolveBrowserUserAgent( baseUserAgent , mode ),
	};
};

export const applyBrowserIdentityToView = (
	view:WebContentsView ,
	domain:string ,
	acceptLanguages:string,
):BrowserIdentityState => {
	const ses = view.webContents.session;
	const identity = resolveBrowserIdentityState( domain , ses.getUserAgent() );
	const targetUserAgent = identity.userAgent;

	try {
		ses.setUserAgent( targetUserAgent , acceptLanguages );
		view.webContents.setUserAgent( targetUserAgent );
	} catch ( error ) {
		console.warn( '[BrowserIdentity] Failed to set user agent:' , error );
	}

	updateSessionRequestHeaderState( ses , {
		acceptLanguages ,
		userAgent : targetUserAgent,
	} );

	return identity;
};

export const mergeBrowserIdentityIntoEnvironment = (
	environment:AIPageEnvironment ,
	identity:BrowserIdentityState,
):AIPageEnvironment => {
	return {
		...environment ,
		browserIdentityMode : identity.mode ,
		browserUserAgent : null,
	};
};

type SessionRequestHeaderState = {
	acceptLanguages?:string;
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

		if( state.userAgent ) {
			requestHeaders['User-Agent'] = state.userAgent;
		} else if( typeof requestHeaders['User-Agent'] === 'string' ) {
			requestHeaders['User-Agent'] = sanitizeElectronUserAgent( requestHeaders['User-Agent'] );
		}

		callback( { requestHeaders } );
	} );
};

import type { AIPageEnvironment } from '#src/Types/AIPageEnvironment';
import { app , type Session , type WebContentsView } from 'electron';
