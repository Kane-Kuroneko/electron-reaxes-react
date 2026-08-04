export type BrowserIdentityMode = 'default' | 'google-ai-studio';

export type BrowserIdentityState = {
	mode:BrowserIdentityMode;
	userAgent:string;
};

/**
 * AI Studio uses a separate MakerSuite control-plane. It has stricter checks than
 * standard Google OAuth. As of mid-2026, Google's accounts.google.com gate also
 * rejects Electron when in-page JS sees Chromium-only userAgentData / empty
 * window.chrome — see docs/issues/google-ai-studio-electron-browser-identity.md.
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

export const getChromeVersionFull = ():string => {
	return process.versions.chrome || '146.0.0.0';
};

export const getChromeVersionMajor = ():string => {
	return getChromeVersionFull().split( '.' )[0] || '146';
};

/**
 * Strip Electron/app product tokens while keeping Chromium's natural UA shape
 * so Sec-CH-UA / userAgentData stay version-aligned with the engine.
 */
export const sanitizeElectronUserAgent = (userAgent:string):string => {
	return userAgent
		.replace( /\s*Electron\/\S+/g , '' )
		.replace( /\s*ChatAIO\/\S+/gi , '' )
		/* Electron often inserts AppName/version immediately before Chrome/ */
		.replace( /\s\S+\/\S+(?=\s+Chrome\/)/g , '' )
		.replace( /\s{2,}/g , ' ' )
		.trim();
};

/**
 * Default + AI Studio share the same UA string strategy: strip markers only.
 * Do NOT rebuild a full Chrome UA string — that desyncs Client Hints.
 * AI Studio additionally gets Sec-CH-UA + main-world Chrome brand patches.
 */
export const resolveBrowserUserAgent = (baseUserAgent:string):string => {
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
	return {
		mode : resolveBrowserIdentityMode( domain ) ,
		userAgent : resolveBrowserUserAgent( baseUserAgent ),
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
		userAgent : targetUserAgent ,
		googleChromeClientHints : identity.mode === 'google-ai-studio' ,
		blockPublicKeyCredentials : true,
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
		browserUserAgent : null ,
		chromeVersionFull : getChromeVersionFull(),
	};
};

type ChromeBrand = {
	brand:string;
	version:string;
};

export const buildGoogleChromeClientHintBrands = (fullVersion:string = getChromeVersionFull()):{
	brands:ChromeBrand[];
	fullVersionList:ChromeBrand[];
	secChUa:string;
	secChUaFullVersionList:string;
} => {
	const major = fullVersion.split( '.' )[0] || '146';
	const brands:ChromeBrand[] = [
		{ brand : 'Chromium' , version : major } ,
		{ brand : 'Google Chrome' , version : major } ,
		{ brand : 'Not_A Brand' , version : '24' },
	];
	const fullVersionList:ChromeBrand[] = [
		{ brand : 'Chromium' , version : fullVersion } ,
		{ brand : 'Google Chrome' , version : fullVersion } ,
		{ brand : 'Not_A Brand' , version : '24.0.0.0' },
	];
	const format = (list:ChromeBrand[]) => list
		.map( item => `"${ item.brand }";v="${ item.version }"` )
		.join( ', ' );
	return {
		brands ,
		fullVersionList ,
		secChUa : format( brands ) ,
		secChUaFullVersionList : format( fullVersionList ),
	};
};

const getClientHintPlatform = ():string => {
	if( process.platform === 'darwin' ) {
		return '"macOS"';
	}
	if( process.platform === 'win32' ) {
		return '"Windows"';
	}
	return '"Linux"';
};

type SessionRequestHeaderState = {
	acceptLanguages?:string;
	userAgent?:string;
	googleChromeClientHints?:boolean;
	/** Deny WebAuthn so Windows USB/passkey OS dialogs cannot appear (Chrome-aligned). */
	blockPublicKeyCredentials?:boolean;
};

const sessionRequestHeaderStateBySession = new WeakMap<Session , SessionRequestHeaderState>();
const installedSessionRequestHeaderHandlers = new WeakSet<Session>();
const installedSessionResponseHeaderHandlers = new WeakSet<Session>();

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
	installSessionResponseHeaderHandler( ses );
};

const setRequestHeader = (
	headers:Record<string , string> ,
	name:string ,
	value:string,
) => {
	const existingKey = Object.keys( headers ).find( key => key.toLowerCase() === name.toLowerCase() );
	if( existingKey ) {
		delete headers[existingKey];
	}
	headers[name] = value;
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
			setRequestHeader( requestHeaders , 'Accept-Language' , state.acceptLanguages );
		}

		if( state.userAgent ) {
			setRequestHeader( requestHeaders , 'User-Agent' , state.userAgent );
		} else if( typeof requestHeaders['User-Agent'] === 'string' ) {
			setRequestHeader(
				requestHeaders ,
				'User-Agent' ,
				sanitizeElectronUserAgent( requestHeaders['User-Agent'] ),
			);
		} else {
			const uaKey = Object.keys( requestHeaders ).find( key => key.toLowerCase() === 'user-agent' );
			if( uaKey && typeof requestHeaders[uaKey] === 'string' ) {
				setRequestHeader(
					requestHeaders ,
					'User-Agent' ,
					sanitizeElectronUserAgent( requestHeaders[uaKey] ),
				);
			}
		}

		/*
		 * Google's 2026 gate checks Sec-CH-UA brands. Electron only advertises
		 * Chromium / Not A(Brand — missing "Google Chrome" → "may not be secure".
		 * Rewrite hints for AI Studio sessions (includes accounts.google.com hops).
		 */
		if( state.googleChromeClientHints ) {
			const hints = buildGoogleChromeClientHintBrands();
			setRequestHeader( requestHeaders , 'Sec-CH-UA' , hints.secChUa );
			setRequestHeader( requestHeaders , 'Sec-CH-UA-Mobile' , '?0' );
			setRequestHeader( requestHeaders , 'Sec-CH-UA-Platform' , getClientHintPlatform() );
			setRequestHeader( requestHeaders , 'Sec-CH-UA-Full-Version-List' , hints.secChUaFullVersionList );
			setRequestHeader( requestHeaders , 'Sec-CH-UA-Full-Version' , `"${ getChromeVersionFull() }"` );
		}

		callback( { requestHeaders } );
	} );
};

const PUBLIC_KEY_CREDENTIALS_PERMISSIONS_POLICY = [
	'publickey-credentials-get=()' ,
	'publickey-credentials-create=()',
].join( ', ' );

const installSessionResponseHeaderHandler = (ses:Session) => {
	if( installedSessionResponseHeaderHandlers.has( ses ) ) {
		return;
	}
	installedSessionResponseHeaderHandlers.add( ses );

	ses.webRequest.onHeadersReceived( ( details , callback ) => {
		const state = sessionRequestHeaderStateBySession.get( ses ) || {};
		const isDocumentFrame = details.resourceType === 'mainFrame'
			|| details.resourceType === 'subFrame';
		if( !state.blockPublicKeyCredentials || !isDocumentFrame ) {
			callback( {} );
			return;
		}

		const responseHeaders = {
			...( details.responseHeaders || {} ),
		};
		const existingKey = Object.keys( responseHeaders ).find(
			key => key.toLowerCase() === 'permissions-policy',
		);
		const previous = existingKey
			? ([] as string[]).concat( responseHeaders[existingKey] || [] )
			: [];
		if( existingKey ) {
			delete responseHeaders[existingKey];
		}
		responseHeaders['Permissions-Policy'] = [
			...previous ,
			PUBLIC_KEY_CREDENTIALS_PERMISSIONS_POLICY,
		];

		callback( { responseHeaders } );
	} );
};

import type { AIPageEnvironment } from '#src/Types/AIPageEnvironment';
import { app , type Session , type WebContentsView } from 'electron';
