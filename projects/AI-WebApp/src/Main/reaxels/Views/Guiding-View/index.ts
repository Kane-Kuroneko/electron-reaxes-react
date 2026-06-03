const { absAppRunningPath } = reaxel_ElectronENV();

export const reaxel_GuidingView = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		guidingView : {
			window : checkAs<BrowserWindow>( null ),
		},
	} );
	
	let ipcRegistered = false;
	let destroyingForFinish = false;
	
	const registerIpc = () => {
		if( ipcRegistered ) return;
		ipcRegistered = true;
		
		useIpcRpc( 'get-guiding-defaults' ).handle( async() => {
			const settings = getSettingsConfigService().getDefaultSettings();
			const resolvedAppearance = resolveAppearance( settings.appearance );
			const environment = getAppearanceEnvironment();
			return {
				appearance : {
					language : settings.appearance.language ,
					resolvedLanguage : resolvedAppearance.language ,
					theme : settings.appearance.theme ,
					resolvedTheme : resolvedAppearance.theme,
				} ,
				systemLanguageName : environment.systemLanguageName ,
				defaultAIs : getAIConfigService().getDefaultAIs(),
			};
		} );
		
		useIpcRpc( 'guiding-save-progress' ).handle( async( { event } , progress ) => {
			saveGuidingProgress( progress );
			return { success : true };
		} );
		
		useIpcRpc( 'guiding-test-connectivity' ).handle( async() => {
			return await testDirectConnectivity();
		} );
		
		useIpcRpc( 'guiding-finish' ).handle( async( { event } , options ) => {
			try {
				console.log( '[GuidingView] finish requested:' , options );
				saveGuidingProgress( options?.progress || {} );
				destroyingForFinish = true;
				await startMainRuntime( {
					openSettings : options?.openSettings === true,
				} );
				destroyGuidingView();
				destroyingForFinish = false;
				return { success : true };
			} catch ( error ) {
				destroyingForFinish = false;
				console.error( '[GuidingView] finish failed:' , error );
				throw error;
			}
		} );
	};
	
	const initGuidingView = () => {
		registerIpc();
		const existingWindow = store.guidingView.window;
		if( existingWindow && !existingWindow.isDestroyed() ) {
			existingWindow.show();
			return existingWindow;
		}
		
		const guidingWindow = new BrowserWindow( {
			width : 960 ,
			height : 680 ,
			minWidth : 820 ,
			minHeight : 560 ,
			title : 'AI WebApp Setup' ,
			show : false ,
			webPreferences : {
				nodeIntegration : false ,
				contextIsolation : true ,
				preload : path.join( absAppRunningPath , 'preload.js' ),
			},
		} );
		guidingWindow.setMenu( null );
		setState.guidingView( { window : guidingWindow } );
		
		guidingWindow.on( 'closed' , () => {
			setState.guidingView( { window : null } );
			if( !destroyingForFinish && !isMainRuntimeStarted() ) {
				app.quit();
			}
		} );
		
		guidingWindow.once( 'ready-to-show' , () => {
			guidingWindow.show();
		} );
		
		if( dev() ) {
			guidingWindow.webContents.loadURL( createDevRendererURL( 'GuidingView' ) , getFreshLoadURLOptions() );
		} else {
			guidingWindow.webContents.loadFile( path.join( absAppRunningPath , './renderer/GuidingView/index.html' ) );
		}
		
		return guidingWindow;
	};
	
	const destroyGuidingView = () => {
		const guidingWindow = store.guidingView.window;
		if( guidingWindow && !guidingWindow.isDestroyed() ) {
			guidingWindow.destroy();
		}
		setState.guidingView( { window : null } );
	};
	
	const rtn = {
		initGuidingView ,
		destroyGuidingView,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const saveGuidingProgress = (progress:Guiding.Progress) => {
	const settingsConfigService = getSettingsConfigService();
	const currentSettings = settingsConfigService.getEffectiveSettings();
	const nextSettings = normalizeRuntimeSettings( {
		...currentSettings ,
		appearance : {
			...currentSettings.appearance ,
			...( progress.appearance || {} ),
		} ,
		networks : {
			...currentSettings.networks ,
			global_proxy : {
				...currentSettings.networks.global_proxy ,
				...( progress.network?.canDirectConnect === true ? { proxy_mode : 'direct' as const } : {} ),
			},
		},
	} );
	settingsConfigService.saveSettings( nextSettings );
	applyElectronAppearance( nextSettings.appearance );
	
	if( progress.AIs ) {
		getAIConfigService().replaceAllAIs( sanitizeGuidingAIs( progress.AIs ) );
	}
};

const sanitizeGuidingAIs = (ais:AI.AIItem[]) => {
	const fallbackProxy = createDefaultProxyConf();
	return ais.map( ai => {
		const family = ai.AI_family || 'custom';
		return {
			id : ai.id || `guiding-ai-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 8 ) }` ,
			label : ai.label || 'Custom AI' ,
			disabled : ai.disabled === true ,
			AI_family : family ,
			url : ai.url || getAIDomainByFamily( family ) ,
			url_override : ai.url_override || null ,
			desc : ai.desc || '' ,
			proxy_mode : ai.proxy_mode || 'follow_global_setting' ,
			from_server_list_proxy : ai.from_server_list_proxy || null ,
			user_fill_proxy : ai.user_fill_proxy || fallbackProxy ,
			preloadOnStartup : ai.preloadOnStartup === true,
		};
	} );
};

const connectivityTargets = [
	{
		id : 'google' ,
		label : 'Google' ,
		url : 'https://www.google.com/generate_204',
	} ,
	{
		id : 'x' ,
		label : 'X / Twitter' ,
		url : 'https://twitter.com',
	} ,
	{
		id : 'youtube' ,
		label : 'YouTube' ,
		url : 'https://www.youtube.com',
	},
];

const testDirectConnectivity = async():Promise<Guiding.ConnectivityResult> => {
	const targets = await Promise.all(
		connectivityTargets.map( testConnectivityTarget ),
	);
	return {
		targets ,
		canDirectConnect : targets.filter( target => target.ok ).length >= 2,
	};
};

const testConnectivityTarget = async(target:typeof connectivityTargets[number]):Promise<Guiding.ConnectivityTargetResult> => {
	const startedAt = Date.now();
	const controller = new AbortController();
	const timer = setTimeout( () => controller.abort() , 6500 );
	try {
		const response = await net.fetch( target.url , {
			method : 'GET' ,
			signal : controller.signal,
		} );
		return {
			...target ,
			ok : response.status >= 200 && response.status < 500 ,
			status : response.status ,
			durationMs : Date.now() - startedAt,
		};
	} catch ( error ) {
		return {
			...target ,
			ok : false ,
			error : error?.message || String( error ) ,
			durationMs : Date.now() - startedAt,
		};
	} finally {
		clearTimeout( timer );
	}
};

const createDevRendererURL = (entry:string) => {
	return `https://localhost:${ __DEV_PORT__ }/${ entry }?t=${ Date.now() }`;
};

const getFreshLoadURLOptions = () => {
	return {
		extraHeaders : [
			'Cache-Control: no-cache',
			'Pragma: no-cache',
		].join( '\n' ),
	};
};

import {
	isMainRuntimeStarted ,
	startMainRuntime,
} from '#main/runtime';
import { useIpcRpc } from '#main/services/ipc';
import {
	applyElectronAppearance ,
	getAppearanceEnvironment ,
	resolveAppearance,
} from '#main/services/appearance';
import {
	createDefaultProxyConf ,
	getSettingsConfigService ,
	normalizeRuntimeSettings,
} from '#main/services/settings/settings-config-service';
import { getAIConfigService } from '#main/services/settings/ai-config-service';
import { getAIDomainByFamily } from '#main/reaxels/Views/AI-Views/data';
import { reaxel_ElectronENV } from '#generics/reaxels/runtime-paths';
import type { Guiding } from '#src/Types/Guiding';
import { AI } from '#src/Types/SettingsTypes/AI';
import {
	app ,
	BrowserWindow ,
	net,
} from 'electron';
import { dev } from 'electron-is';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import * as path from 'node:path';
