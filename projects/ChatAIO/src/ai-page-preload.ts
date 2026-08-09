const useMtr = createIpc<MainToRendererEvents>( 'mtrEvent' );

const fallbackEnvironment:AIPageEnvironment = {
	language : 'en-US' ,
	languages : [ 'en-US' , 'en' ] ,
	theme : 'light' ,
	themeSource : 'light' ,
	backgroundColor : '#ffffff' ,
	acceptLanguages : 'en-US,en;q=0.9',
};

const sendSync = <Channel extends keyof IpcSyncRpc>(
	channel:Channel ,
	...payloads:IpcSyncRpc[Channel]['payloads']
):IpcSyncRpc[Channel]['response'] => {
	return ipcRenderer.sendSync( 'JSON_SYNC' , { channel } , ...payloads );
};

const getInitialAIPageEnvironment = ():AIPageEnvironment => {
	try {
		const environment = sendSync( 'get-ai-page-environment' );
		return isAIPageEnvironment( environment )
			? environment
			: fallbackEnvironment;
	} catch ( error ) {
		console.warn( '[AIPagePreload] Failed to get initial environment:' , error );
		return fallbackEnvironment;
	}
};

const isAIPageEnvironment = (value:unknown):value is AIPageEnvironment => {
	if( !value || typeof value !== 'object' ) {
		return false;
	}
	const environment = value as Partial<AIPageEnvironment>;
	return typeof environment.language === 'string'
		&& Array.isArray( environment.languages )
		&& ( environment.theme === 'light' || environment.theme === 'dark' )
		&& typeof environment.themeSource === 'string'
		&& typeof environment.backgroundColor === 'string'
		&& typeof environment.acceptLanguages === 'string';
};

let currentEnvironment = getInitialAIPageEnvironment();

const defineNavigatorGetter = (key:'language' | 'languages' , getter:() => unknown) => {
	try {
		Object.defineProperty( Navigator.prototype , key , {
			get : getter ,
			configurable : true,
		} );
	} catch ( error ) {
		console.warn( '[AIPagePreload] Failed to override navigator.' + key , error );
	}
};

const installNavigatorEnvironment = () => {
	defineNavigatorGetter( 'language' , () => currentEnvironment.language );
	defineNavigatorGetter( 'languages' , () => currentEnvironment.languages.slice() );
	installBrowserIdentitySpoofing();
};

/**
 * Default: light webdriver mask via AutomationControlled + optional override.
 * Google Chrome identity (all AI pages as of 2026-08): skip instance-level
 * webdriver accessor (itself a detection signal) and instead patch main-world
 * userAgentData / window.chrome — verified against Google's
 * "This browser or app may not be secure" gate (linux-mail-wrapper). Needed for
 * ChatGPT / Gemini Continue-with-Google as well as AI Studio.
 *
 * All AI pages: block public-key WebAuthn so Electron does not surface the Windows
 * "insert security key" dialog (Electron #47147 — conditional mediation pops OS UI;
 * Chrome keeps it silent / autofill-only). Sites fall back to password.
 */
const installBrowserIdentitySpoofing = () => {
	installChromeAlignedWebAuthnGuard();
	const mode = currentEnvironment.browserIdentityMode;
	if( mode === 'google-chrome-identity' || mode === 'google-ai-studio' ) {
		installGoogleChromeMainWorldIdentity();
		return;
	}
	try {
		Object.defineProperty( navigator , 'webdriver' , {
			get : () => false ,
			configurable : true,
		} );
	} catch ( error ) {
		console.warn( '[AIPagePreload] Failed to mask navigator.webdriver:' , error );
	}
};

/**
 * Chrome-aligned WebAuthn guard (main world).
 * Electron advertises conditional mediation then shows a Windows USB/passkey modal;
 * Chrome does not. Reject publicKey ceremonies so Google uses password / other methods.
 */
const installChromeAlignedWebAuthnGuard = () => {
	try {
		contextBridge.executeInMainWorld( {
			func : () => {
				try {
					const mark = '__chataioWebAuthnGuard';
					if( ( window as any )[mark] ) {
						return;
					}
					( window as any )[mark] = true;

					const notSupported = () => new DOMException(
						'The user agent does not support public key credentials.' ,
						'NotSupportedError',
					);
					const notAllowed = () => new DOMException(
						'Conditional mediation is not available.' ,
						'NotAllowedError',
					);

					const PublicKey = ( window as any ).PublicKeyCredential;
					if( PublicKey ) {
						if( typeof PublicKey.isConditionalMediationAvailable === 'function' ) {
							PublicKey.isConditionalMediationAvailable = async () => false;
						}
						if( typeof PublicKey.isUserVerifyingPlatformAuthenticatorAvailable === 'function' ) {
							PublicKey.isUserVerifyingPlatformAuthenticatorAvailable = async () => false;
						}
						if( typeof PublicKey.getClientCapabilities === 'function' ) {
							PublicKey.getClientCapabilities = async () => ( {
								conditionalGet : false ,
								conditionalCreate : false ,
								hybridTransport : false ,
								passkeyPlatformAuthenticator : false ,
								userVerifyingPlatformAuthenticator : false,
							} );
						}
					}

					const proto = CredentialsContainer && CredentialsContainer.prototype;
					if( !proto ) {
						return;
					}
					const originalGet = proto.get;
					const originalCreate = proto.create;

					proto.get = async function( options?:CredentialRequestOptions ) {
						if( options && ( options as any ).publicKey ) {
							if( ( options as any ).mediation === 'conditional' ) {
								throw notAllowed();
							}
							throw notSupported();
						}
						return originalGet.call( this , options );
					};

					proto.create = async function( options?:CredentialCreationOptions ) {
						if( options && ( options as any ).publicKey ) {
							throw notSupported();
						}
						return originalCreate.call( this , options );
					};
				} catch { /* never break the page */ }
			} ,
			args : [],
		} );
	} catch ( error ) {
		console.warn( '[AIPagePreload] Failed to install WebAuthn guard:' , error );
	}
};

const resolveChromeVersionFull = ():string => {
	if( typeof currentEnvironment.chromeVersionFull === 'string' && currentEnvironment.chromeVersionFull ) {
		return currentEnvironment.chromeVersionFull;
	}
	try {
		return process.versions.chrome || '146.0.0.0';
	} catch {
		return '146.0.0.0';
	}
};

const resolveClientHintPlatform = ():string => {
	try {
		if( process.platform === 'darwin' ) {
			return 'macOS';
		}
		if( process.platform === 'win32' ) {
			return 'Windows';
		}
	} catch { /* fall through */ }
	return 'Linux';
};

/**
 * Must run in the page main world (contextIsolation keeps preload isolated).
 * Patches land before Google scripts via preload timing + executeInMainWorld.
 */
const installGoogleChromeMainWorldIdentity = () => {
	const full = resolveChromeVersionFull();
	const platform = resolveClientHintPlatform();
	try {
		contextBridge.executeInMainWorld( {
			func : ( chromeFull:string , platformName:string ) => {
				try {
					const major = chromeFull.split( '.' )[0] || '146';
					const brands = [
						{ brand : 'Chromium' , version : major } ,
						{ brand : 'Google Chrome' , version : major } ,
						{ brand : 'Not_A Brand' , version : '24' },
					];
					const fullVersionList = [
						{ brand : 'Chromium' , version : chromeFull } ,
						{ brand : 'Google Chrome' , version : chromeFull } ,
						{ brand : 'Not_A Brand' , version : '24.0.0.0' },
					];
					const highEntropy = {
						architecture : 'x86' ,
						bitness : '64' ,
						brands ,
						fullVersionList ,
						mobile : false ,
						model : '' ,
						platform : platformName ,
						platformVersion : platformName === 'Windows' ? '15.0.0' : '14.0.0' ,
						uaFullVersion : chromeFull ,
						wow64 : false,
					};
					const uaData = {
						brands ,
						mobile : false ,
						platform : platformName ,
						getHighEntropyValues : () => Promise.resolve( highEntropy ) ,
						toJSON : () => ( { brands , mobile : false , platform : platformName } ),
					};
					Object.defineProperty( Navigator.prototype , 'userAgentData' , {
						get : () => uaData ,
						configurable : true,
					} );

					const t = Date.now() / 1000;
					const chrome = ( window as any ).chrome || {};
					chrome.app = chrome.app || {
						isInstalled : false ,
						InstallState : {
							DISABLED : 'disabled' ,
							INSTALLED : 'installed' ,
							NOT_INSTALLED : 'not_installed',
						} ,
						RunningState : {
							CANNOT_RUN : 'cannot_run' ,
							READY_TO_RUN : 'ready_to_run' ,
							RUNNING : 'running',
						},
					};
					chrome.runtime = chrome.runtime || {
						OnInstalledReason : {} ,
						OnRestartRequiredReason : {} ,
						PlatformArch : {} ,
						PlatformOs : {} ,
						connect : function(){} ,
						sendMessage : function(){},
					};
					chrome.loadTimes = chrome.loadTimes || function(){
						return {
							requestTime : t ,
							startLoadTime : t ,
							commitLoadTime : t ,
							finishDocumentLoadTime : t ,
							finishLoadTime : t ,
							firstPaintTime : t ,
							firstPaintAfterLoadTime : 0 ,
							navigationType : 'Other' ,
							wasFetchedViaSpdy : true ,
							wasNpnNegotiated : true ,
							npnNegotiatedProtocol : 'h2' ,
							wasAlternateProtocolAvailable : false ,
							connectionInfo : 'h2',
						};
					};
					chrome.csi = chrome.csi || function(){
						return {
							startE : Date.now() ,
							onloadT : Date.now() ,
							pageT : 1000 ,
							tran : 15,
						};
					};
					( window as any ).chrome = chrome;
				} catch { /* never break the page */ }
			} ,
			args : [ full , platform ],
		} );
	} catch ( error ) {
		console.warn( '[AIPagePreload] Failed to install Google Chrome main-world identity:' , error );
	}
};

const applyThemeToDocument = () => {
	const root = document.documentElement;
	if( !root ) {
		return false;
	}
	root.dataset.chataioTheme = currentEnvironment.theme;
	root.dataset.chataioThemeSource = currentEnvironment.themeSource;
	root.style.colorScheme = currentEnvironment.theme;
	return true;
};

const syncLoadingThemeStyle = () => {
	const existingStyle = document.getElementById( 'chataio-loading-theme-style' );
	if( currentEnvironment.theme !== 'dark' ) {
		existingStyle?.remove();
		return;
	}
	const container = document.head || document.documentElement;
	if( !container ) {
		return;
	}
	const style = existingStyle || document.createElement( 'style' );
	style.id = 'chataio-loading-theme-style';
	style.textContent = `
html[data-chataio-theme="dark"] {
	background-color: ${ currentEnvironment.backgroundColor };
	color-scheme: dark;
}
html[data-chataio-theme="dark"] body {
	background-color: ${ currentEnvironment.backgroundColor };
}
`;
	if( !existingStyle ) {
		container.appendChild( style );
	}
};

/**
 * preload 在文档提交（commit）时即执行，此时解析器可能还没创建 <html>，
 * document.documentElement 为 null（首字节较慢的站点更容易命中，如 chat.deepseek.com）。
 * 此时挂 MutationObserver 等 <html> 出现后立刻补应用，避免等到 DOMContentLoaded 造成白屏闪烁。
 */
let documentElementObserver:MutationObserver | null = null;

const applyThemeWhenDocumentElementReady = () => {
	if( documentElementObserver || document.documentElement ) {
		return;
	}
	try {
		documentElementObserver = new MutationObserver( () => {
			if( !document.documentElement ) {
				return;
			}
			documentElementObserver?.disconnect();
			documentElementObserver = null;
			applyAIPageEnvironment( currentEnvironment );
		} );
		documentElementObserver.observe( document , { childList : true } );
	} catch ( error ) {
		console.warn( '[AIPagePreload] Failed to observe documentElement creation:' , error );
	}
};

const applyAIPageEnvironment = (environment:AIPageEnvironment) => {
	currentEnvironment = environment;
	try {
		if( applyThemeToDocument() ) {
			syncLoadingThemeStyle();
		} else {
			applyThemeWhenDocumentElementReady();
		}
	} catch ( error ) {
		console.warn( '[AIPagePreload] Failed to apply page environment:' , error );
	}
	installBrowserIdentitySpoofing();
};

installNavigatorEnvironment();
applyAIPageEnvironment( currentEnvironment );

/* FocusMonitor: 焦点状态追踪（通过 IPC 推送状态变化到主进程） */
{
	const pushFocusState = ( state: import( './ai-page-preload-focus' ).FocusState ) => {
		try {
			ipcRenderer.send( 'JSON' , { channel : 'focus-state-change' } , {
				hasFocusedElement : state.hasFocusedElement,
				activeElement : state.activeElement,
				lastFocusChange : state.lastFocusChange ,
				reportedAt : Date.now(),
			} );
		} catch { /* 观测层静默处理 */ }
	};
	initFocusTracker( pushFocusState );
}

if( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded' , () => {
		applyAIPageEnvironment( currentEnvironment );
	} , { once : true } );
} else {
	applyAIPageEnvironment( currentEnvironment );
}

useMtr( 'ai-page-environment-change' )( ( _ , environment ) => {
	if( !isAIPageEnvironment( environment ) ) {
		console.warn( '[AIPagePreload] Ignored invalid environment update:' , environment );
		return;
	}
	applyAIPageEnvironment( environment );
} );

import type {
	IpcSyncRpc ,
	MainToRendererEvents,
} from './Types/IpcSchema';
import type { AIPageEnvironment } from '#src/Types/AIPageEnvironment';
import { initFocusTracker } from './ai-page-preload-focus';
import { createIpc } from '#generics/toolkit/electron/preload.ipc';
import { contextBridge , ipcRenderer } from 'electron';
