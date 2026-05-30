export const reaxel_Settings = reaxel( () => {
	const settingsConfigService = getSettingsConfigService();
	const aiConfigService = getAIConfigService();
	const initialSettings = settingsConfigService.getEffectiveSettings();
	
	const { setState , store , mutate } = createReaxable( {
		networks : initialSettings.networks ,
		system : initialSettings.system ,
		appearance : initialSettings.appearance,
	} );
	
	const getCurrentSettings = ():Settings => ( {
		networks : cloneData( store.networks ) ,
		system : cloneData( store.system ) ,
		appearance : cloneData( store.appearance ) ,
		AIs : aiConfigService.getEffectiveAIs(),
	} );
	
	const getFetchResult = ():SettingsFetchResult => ( {
		...getCurrentSettings() ,
		hasUserModifications : settingsConfigService.hasUserModifications() || aiConfigService.hasUserModifications(),
	} );
	
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
			appearance : settings.appearance,
		} );
		const normalizedAIs = ( settings.AIs || [] ).map( ai => ( {
			...ai ,
			disabled : ai.disabled === true ,
			url_override : ai.url_override || null ,
			proxy_mode : ai.proxy_mode || 'follow_global_setting' ,
			from_server_list_proxy : ai.from_server_list_proxy || null ,
			user_fill_proxy : ai.user_fill_proxy || null ,
			preloadOnStartup : ai.preloadOnStartup === true,
		} ) );
		
		settingsConfigService.saveSettings( normalizedRuntimeSettings );
		aiConfigService.replaceAllAIs( normalizedAIs );
		
		mutate( s => {
			s.networks = normalizedRuntimeSettings.networks;
			s.system = normalizedRuntimeSettings.system;
			s.appearance = normalizedRuntimeSettings.appearance;
		} );
		
		// 同步主进程 i18n 语言（防御性，确保与持久化配置一致）
		reaxel_I18n().setLanguage(normalizedRuntimeSettings.appearance.language as any);
		
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
		// 销毁所有AI Views并清除session/storage
		await reaxel_AIViews().destroyAllAndClearData();
		// 重置配置到默认
		aiConfigService.resetToDefaults();
		// 重新同步视图(重建菜单+重新初始化AI Views)
		await syncRuntimeViews();
		return { success : true };
	} );
	
	useIpcRpc( 'get-preload-ai-families' ).handle( async() => {
		return aiConfigService.getPreloadAIFamilies();
	} );
	
	const rtn = {
		getCurrentSettings ,
		applySettings,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const cloneData = <T>(data:T):T => JSON.parse( JSON.stringify( data ) );

const applyPatchByPath = <T extends object>(settings:T , path:string , data:any):T => {
	const patchedSettings = cloneData( settings );
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
import {
	getSettingsConfigService ,
	normalizeRuntimeSettings,
} from '#main/services/settings/settings-config-service';
import { getAIConfigService } from '#main/services/settings/ai-config-service';
import { syncTrayState , updateTrayMenu } from '#main/services/tray';
import {
	reaxel ,
	createReaxable,
} from 'reaxes';
import type {
	Settings ,
	SettingsApplyResult ,
	SettingsFetchResult,
} from '#src/Types/SettingsTypes';
