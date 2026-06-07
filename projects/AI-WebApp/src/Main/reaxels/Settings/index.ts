export const reaxel_Settings = reaxel( () => {
	const settingsConfigService = getSettingsConfigService();
	const aiConfigService = getAIConfigService();
	const initialSettings = settingsConfigService.getEffectiveSettings();
	
	const { setState , store , mutate } = createReaxable( {
		networks : initialSettings.networks ,
		system : initialSettings.system ,
		startup : initialSettings.startup ,
		appearance : initialSettings.appearance,
	} );
	
	const getCurrentSettings = ():Settings => ( {
		networks : cloneObservableToPlain( store.networks ) ,
		system : cloneObservableToPlain( store.system ) ,
		startup : cloneObservableToPlain( store.startup ) ,
		appearance : cloneObservableToPlain( store.appearance ) ,
		AIs : aiConfigService.getEffectiveAIs(),
	} );
	
	const getFetchResult = ():SettingsFetchResult => ( {
		...getCurrentSettings() ,
		hasUserModifications : settingsConfigService.hasUserModifications() || aiConfigService.hasUserModifications(),
	} );
	
	const reloadFromDisk = ():Settings => {
		const persistedSettings = settingsConfigService.getEffectiveSettings();
		mutate( s => {
			s.networks = cloneObservableToPlain( persistedSettings.networks );
			s.system = cloneObservableToPlain( persistedSettings.system );
			s.startup = cloneObservableToPlain( persistedSettings.startup );
			s.appearance = cloneObservableToPlain( persistedSettings.appearance );
		} );
		return getCurrentSettings();
	};

	const syncRuntimeViews = async() => {
		const settings = getCurrentSettings();
		await reaxel_AIViews().syncAIViewsWithConfig( settings );
		reaxel_Menu().rebuildMenu();
		syncTrayState( settings.system.show_tray );
		updateTrayMenu();
	};
	
	const applySettings = async( settings:Settings ):Promise<SettingsApplyResult> => {
		const previousSettings = getCurrentSettings();
		const normalizedRuntimeSettings = normalizeRuntimeSettings( {
			networks : settings.networks ,
			system : settings.system ,
			startup : settings.startup ,
			appearance : settings.appearance,
		} );
		const normalizedAIs = ( settings.AIs || [] ).map( ai => ( {
			...ai ,
			disabled : ai.disabled === true ,
			url_override : ai.url_override || null ,
			proxy_mode : ai.proxy_mode || 'follow_global_setting' ,
			from_server_list_proxy : getEnabledProxyServerId(
				ai.from_server_list_proxy ,
				normalizedRuntimeSettings.networks.proxy_server_list,
			) ,
			user_fill_proxy : ai.user_fill_proxy || null ,
			preloadOnStartup : ai.preloadOnStartup === true,
		} ) );
		
		settingsConfigService.saveSettings( normalizedRuntimeSettings );
		aiConfigService.replaceAllAIs( normalizedAIs );
		
		mutate( s => {
			s.networks = normalizedRuntimeSettings.networks;
			s.system = normalizedRuntimeSettings.system;
			s.startup = normalizedRuntimeSettings.startup;
			s.appearance = normalizedRuntimeSettings.appearance;
		} );
		
		const resolvedAppearance = applyElectronAppearance( normalizedRuntimeSettings.appearance );
		// 同步主进程 i18n 语言（防御性，确保与持久化配置一致）
		reaxel_I18n().setLanguage(resolvedAppearance.language as any);
		
		await syncRuntimeViews();
		
		const restartReasons = detectRestartReasons( previousSettings , getCurrentSettings() );
		return {
			success : true ,
			restartRequired : restartReasons.length > 0 ,
			restartReasons ,
			applied : {
				settingsPersisted : true ,
				aiViewsSynced : true ,
				menuRebuilt : true ,
				proxyUpdated : JSON.stringify( previousSettings.networks ) !== JSON.stringify( normalizedRuntimeSettings.networks ),
			} ,
			settings : getCurrentSettings(),
		};
	};
	
	rehancer_ipcReceive( { store , setState , mutate } )();
	
	useIpcRendererToMain( 'exit-settings' ).on( () => {
		Reaxel_View.setState( { settingsViewOpened : false } );
	} );
	
	useIpcRendererToMain( 'update-preload-ai-config' ).on( async() => {
		await syncRuntimeViews();
	} );
	
	useIpcRpc( 'fetch-settings' ).handle( async() => {
		return getFetchResult();
	} );
	
	useIpcRpc( 'apply-settings' ).handle( async( { event } , settings ) => {
		try {
			return await applySettings( settings );
		} catch ( error ) {
			console.error( '[Settings] Failed to apply settings:' , error );
			return {
				success : false ,
				restartRequired : false ,
				restartReasons : [] ,
				applied : {
					settingsPersisted : false ,
					aiViewsSynced : false ,
					menuRebuilt : false ,
					proxyUpdated : false,
				} ,
				error : error?.message || String( error ),
			};
		}
	} );
	
	useIpcRpc( 'submit-settings' ).handle( async( { event } , path , data ) => {
		try {
			const patchedSettings = applyPatchByPath( getCurrentSettings() , path , data );
			const result = await applySettings( patchedSettings );
			return {
				success : result.success ,
				error : result.error,
			};
		} catch ( error ) {
			console.error( '[Settings] Failed to submit settings:' , error );
			return {
				success : false ,
				error : error?.message || String( error ),
			};
		}
	} );

	useIpcRpc( 'set-startup-ai-page-load-mode' ).handle( async( { event } , mode ) => {
		try {
			return await applySettings( {
				...getCurrentSettings() ,
				startup : {
					...store.startup ,
					aiPageLoadMode : normalizeStartupAIPageLoadMode( mode ),
				},
			} );
		} catch ( error ) {
			console.error( '[Settings] Failed to set startup AI page load mode:' , error );
			return {
				success : false ,
				restartRequired : false ,
				restartReasons : [] ,
				applied : {
					settingsPersisted : false ,
					aiViewsSynced : false ,
					menuRebuilt : false ,
					proxyUpdated : false,
				} ,
				error : error?.message || String( error ),
			};
		}
	} );

	useIpcRpc( 'test-proxy-server' ).handle( async( { event } , proxyConf , url ) => {
		return await testProxyConnectivity( proxyConf , url );
	} );
	
	useIpcRpc( 'get-ais' ).handle( async() => {
		return aiConfigService.getEffectiveAIs();
	} );
	
	useIpcRpc( 'get-default-ais' ).handle( async() => {
		return aiConfigService.getDefaultAIs();
	} );
	
	useIpcRpc( 'update-ai' ).handle( async( { event } , id , updates ) => {
		const updatedAI = aiConfigService.updateAI( id , updates );
		await syncRuntimeViews();
		return updatedAI;
	} );
	
	useIpcRpc( 'add-ai' ).handle( async( { event } , ai ) => {
		const newAI = aiConfigService.addAI( ai );
		await syncRuntimeViews();
		return newAI;
	} );
	
	useIpcRpc( 'delete-ai' ).handle( async( { event } , id ) => {
		const deleted = aiConfigService.deleteAI( id );
		await syncRuntimeViews();
		return deleted;
	} );
	
	useIpcRpc( 'reset-ais-to-defaults' ).handle( async() => {
		try {
			const resetAIIds = collectResetAISessionIds( aiConfigService );
			const clearResult = await reaxel_AIViews().destroyAllAndClearData( resetAIIds );

			if( !clearResult.success ) {
				await syncRuntimeViews();
				return {
					success : false ,
					error : formatResetAIDataError( clearResult.errors ),
				};
			}

			// session/storage 清理成功后再重置配置，避免失败时丢失可重试的 AI id 来源。
			aiConfigService.resetToDefaults();
			await syncRuntimeViews();
			return { success : true };
		} catch ( error ) {
			await syncRuntimeViews();
			console.error( '[Settings] Failed to reset AIs to defaults:' , error );
			return {
				success : false ,
				error : error?.message || String( error ),
			};
		}
	} );
	
	useIpcRpc( 'get-preload-ai-families' ).handle( async() => {
		return aiConfigService.getPreloadAIFamilies();
	} );

	useIpcRpc( 'dev-clean-start' ).handle( async() => {
		return requestDevCleanStart();
	} );

	const rtn = {
		getCurrentSettings ,
		applySettings ,
		reloadFromDisk,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const applyPatchByPath = <T extends object>(settings:T , path:string , data:any):T => {
	const patchedSettings = cloneObservableToPlain( settings );
	const keys = path.split( '/' ).filter( Boolean );
	let target:any = patchedSettings;
	
	for( let i = 0 ; i < keys.length - 1 ; i++ ) {
		const key = keys[i];
		if( !target[key] || typeof target[key] !== 'object' ) {
			target[key] = {};
		}
		target = target[key];
	}
	
	target[keys[keys.length - 1]] = data;
	return patchedSettings;
};

const detectRestartReasons = (previousSettings:Settings , nextSettings:Settings):string[] => {
	const restartReasons:string[] = [];
	
	if( previousSettings.system.gpu_acceleration !== nextSettings.system.gpu_acceleration ) {
		restartReasons.push( reaxel_I18n().i18n( 'GPU acceleration is applied before Electron creates browser processes.' ) );
	}
	
	return restartReasons;
};

const getEnabledProxyServerId = (
	proxyServerId:string | null | undefined ,
	proxyServerList:Settings['networks']['proxy_server_list'],
) => {
	return proxyServerList.some( server => {
		return server.enabled !== false && server.proxy_server_id === proxyServerId;
	} )
		? proxyServerId
		: null;
};

const collectResetAISessionIds = (aiConfigService:ReturnType<typeof getAIConfigService>) => {
	const userConfig = aiConfigService.getUserConfig();
	return Array.from( new Set( [
		...aiConfigService.getEffectiveAIs().map( ai => ai.id ) ,
		...aiConfigService.getDefaultAIs().map( ai => ai.id ) ,
		...( userConfig?.ais || [] ).map( ai => ai.id ) ,
		...( userConfig?.deletedIds || [] ),
	].filter( Boolean ) ) );
};

const formatResetAIDataError = (errors:{ target:string; error:string }[]) => {
	return `Failed to clear AI page data for ${ errors.length } target(s): ${
		errors.map( item => `${ item.target } (${ item.error })` ).join( '; ' )
	}`;
};

export type Reaxel_Settings = typeof reaxel_Settings;

import {
	useIpcRpc ,
	useIpcRendererToMain,
} from '#main/services/ipc';
import { reaxel_AIViews } from '#main/reaxels/Views/AI-Views';
import { reaxel_Menu } from '#main/reaxels/Menu';
import { reaxel_I18n } from '#main/reaxels/I18n';
import { Reaxel_View } from '#main/reaxels/Views';
import { rehancer_ipcReceive } from './rehancer_ipcReceive';
import { applyElectronAppearance } from '#main/services/appearance';
import {
	getSettingsConfigService ,
	normalizeStartupAIPageLoadMode ,
	normalizeRuntimeSettings,
} from '#main/services/settings/settings-config-service';
import { testProxyConnectivity } from '#main/services/settings/proxy-service';
import { getAIConfigService } from '#main/services/settings/ai-config-service';
import { syncTrayState , updateTrayMenu } from '#main/services/tray';
import { requestDevCleanStart } from '#main/services/dev/clean-start';
import { cloneObservableToPlain } from '#src/shared/utils/clone-for-ipc.utility';
import {
	reaxel ,
	createReaxable,
} from 'reaxes';
import type {
	Settings ,
	SettingsApplyResult ,
	SettingsFetchResult,
} from '#src/Types/SettingsTypes';
