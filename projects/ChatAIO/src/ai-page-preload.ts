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
};

const applyThemeToDocument = () => {
	document.documentElement.dataset.chataioTheme = currentEnvironment.theme;
	document.documentElement.dataset.chataioThemeSource = currentEnvironment.themeSource;
	document.documentElement.style.colorScheme = currentEnvironment.theme;
};

const syncLoadingThemeStyle = () => {
	const existingStyle = document.getElementById( 'chataio-loading-theme-style' );
	if( currentEnvironment.theme !== 'dark' ) {
		existingStyle?.remove();
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
		( document.head || document.documentElement ).appendChild( style );
	}
};

const applyAIPageEnvironment = (environment:AIPageEnvironment) => {
	currentEnvironment = environment;
	applyThemeToDocument();
	syncLoadingThemeStyle();
};

installNavigatorEnvironment();
applyAIPageEnvironment( currentEnvironment );

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
import { createIpc } from '#generics/toolkit/electron/preload.ipc';
import { ipcRenderer } from 'electron';
