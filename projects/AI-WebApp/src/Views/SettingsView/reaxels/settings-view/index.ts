export const reaxel_SettingsView = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		RootMenu : {
			current : checkAs<Menus>( 'general' ) ,
			menus : [
				{
					label : 'General' ,
					value : checkAs<Menus>( 'general' ),
				} ,
				{
					label : 'Networks' ,
					value : checkAs<Menus>( 'net' ),
				} ,
				{
					label : 'Manage AIs' ,
					value : checkAs<Menus>( 'mngeai' ),
				},
			],
		} ,
		UIControls : {
			networks : {
				proxy_mode : checkAs<NetworkProxy.GlobalProxyMode>( 'user_fill' ) ,
				using_proxy_server_id : checkAs<string>( '1' ) ,
				proxy_fields : defaultGlobalProxyFields() ,
				check_connection : {
					modal_visible : false ,
					address : '' ,
					pending : false ,
					success : false ,
					error : null,
				} ,
				edit_proxy_server_modal : {
					visible : false ,
					mode : checkAs<"edit" | "add">( 'edit' ) ,
					editing_id : null ,
					fields : {
						server_name : '' ,
						enabled : true ,
						proxy_conf : defaultProxyConf(),
					},
				} ,
				proxy_server_list : defaultProxyServers(),
			} ,
			manage_AIs : {
				edit_AI_modal : {
					visible : false ,
					mode : checkAs<"edit" | "add">( 'edit' ) ,
					editing_id : null ,
					fields : defaultAIFields(),
				},
			} ,
			appearance : {
				darkmode : false ,
				theme : checkAs<Appearance.Theme>( 'system' ) ,
				show_quickswitch_tag : true ,
				show_current_tag : true ,
				language : checkAs<Appearance.Language>( 'follow-system' ),
			} ,
			system : {
				gpu_acceleration : true ,
				show_tray : true ,
				close_to_tray : true,
			} ,
			hotkeys : {},
		} ,
		Data : {
			AIs : checkAs<AI.AIItem[]>( [] ),
		} ,
		Environment : {
			systemLanguage : checkAs<Languages>( normalizeConcreteLanguage( navigator.language ) ) ,
			systemTheme : checkAs<'light' | 'dark'>( getBrowserSystemTheme() ),
		} ,
		get_settings_status : {
			pending : false ,
			error : false,
		} ,
		submit_settings_status : {
			pending : false ,
			error : false,
		},
	} );
	
	rehancer_Dev( { store , setState , mutate } )();
	
	const ipcMethods = createSettingsIpcService();
	
	// dirty 状态追踪: 存储上次加载/应用成功后的设置快照
	let _lastSavedSnapshot = '';
	// 已提交(已生效)的 AI IDs 集合，用于前端判断哪些 AI 是新增未保存的
	let _committedAIIds = new Set<string>();
	// 已提交的 AI 快照，用于判断是否已修改
	let _committedAISnapshot = new Map<string , string>();
	
	function updateSnapshot() {
		_lastSavedSnapshot = JSON.stringify( buildSettingsFromStore() );
		// 同步更新 committed AI 状态
		_committedAIIds = new Set( store.Data.AIs.map( ai => ai.id ) );
		_committedAISnapshot = new Map(
			store.Data.AIs.map( ai => [ ai.id , JSON.stringify( ai ) ] ),
		);
	}
	
	function isDirty(): boolean {
		if( !_lastSavedSnapshot ) return false;
		return JSON.stringify( buildSettingsFromStore() ) !== _lastSavedSnapshot;
	}
	
	~async function loadSettingsOnStartup() {
		await reloadSettings();
	}();
	
	if( typeof window !== 'undefined' && window.matchMedia ) {
		const darkSchemeQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
		darkSchemeQuery.addEventListener?.( 'change' , event => {
			const systemTheme = event.matches ? 'dark' : 'light';
			setState.Environment( { systemTheme } );
			if( store.UIControls.appearance.theme === 'system' ) {
				applyThemePreferenceToDocument( 'system' , systemTheme );
			}
		} );
	}

	async function fetchSettings() {
		return await ipcMethods.fetchSettings();
	}
	
	async function reloadSettings() {
		setState.get_settings_status( {
			pending : true ,
			error : false,
		} );
		try {
			const [ environment , settings ] = await Promise.all( [
				ipcMethods.getAppearanceEnvironment() ,
				fetchSettings(),
			] );
			setState.Environment( environment );
			setSettings( settings );
			setState.get_settings_status( {
				pending : false ,
				error : false,
			} );
			return settings;
		} catch ( error ) {
			console.error( '[SettingsView] Failed to load settings:' , error );
			setState.get_settings_status( {
				pending : false ,
				error : true,
			} );
			throw error;
		}
	}
	
	function setSettings( settings:SettingsFetchResult | Settings ) {
		setState.UIControls.networks( {
			proxy_mode : settings.networks.global_proxy.proxy_mode ,
			using_proxy_server_id : settings.networks.global_proxy.proxy_server_id || null ,
			proxy_fields : {
				...defaultGlobalProxyFields() ,
				...( settings.networks.global_proxy.user_fill_proxy || {} ),
			} ,
			proxy_server_list : settings.networks.proxy_server_list || defaultProxyServers(),
		} );
		setState.UIControls.appearance( {
			darkmode : settings.appearance.darkmode ,
			theme : settings.appearance.theme || normalizeThemePreference( undefined , settings.appearance.darkmode ) ,
			language : settings.appearance.language,
		} );
		setState.UIControls.system( settings.system );
		mutate( s => {
			s.Data.AIs = settings.AIs || [];
		} );
		
		// 同步 i18n 语言到渲染进程的 i18n 模块
		// 以持久化配置 (user-settings.json) 为单一数据源
		if (settings.appearance.language) {
			reaxel_I18n().setLanguage(resolveLanguagePreference(
				settings.appearance.language ,
				store.Environment.systemLanguage,
			) as any);
		}
		applyThemePreferenceToDocument( settings.appearance.theme , store.Environment.systemTheme );
		
		// 更新快照，用于 dirty 状态检测
		updateSnapshot();
	}
	
	function buildSettingsFromStore():Settings {
		const networks = store.UIControls.networks;
		const raw = {
			networks : {
				global_proxy : {
					proxy_mode : networks.proxy_mode ,
					proxy_server_id : networks.using_proxy_server_id ,
					user_fill_proxy : {
						...defaultGlobalProxyFields() ,
						...networks.proxy_fields ,
						no_proxy_for : networks.proxy_fields.no_proxy_for || [] ,
						no_proxy_for__enabled : networks.proxy_fields.no_proxy_for__enabled !== false,
					},
				} ,
				proxy_server_list : networks.proxy_server_list,
			} ,
			AIs : store.Data.AIs ,
			system : store.UIControls.system ,
			appearance : {
				darkmode : store.UIControls.appearance.darkmode ,
				theme : store.UIControls.appearance.theme ,
				language : store.UIControls.appearance.language,
			},
		};
		// 深拷贝去除 Proxy 包装, 使数据可通过 IPC 结构化克隆传输
		return JSON.parse( JSON.stringify( raw ) );
	}
	
	async function applySettings() {
		setState.submit_settings_status( {
			pending : true ,
			error : false,
		} );
		try {
			const result = await ipcMethods.applySettings( buildSettingsFromStore() );
			if( result.success && result.settings ) {
				setSettings( result.settings );
			}
			setState.submit_settings_status( {
				pending : false ,
				error : !result.success,
			} );
			return result;
		} catch ( error ) {
			console.error( '[SettingsView] Failed to apply settings:' , error );
			setState.submit_settings_status( {
				pending : false ,
				error : true,
			} );
			throw error;
		}
	}
	
	const changeEditAIModalVisible = (visible:boolean , AI_id?:string) => {
		const targetFields = AI_id
			? store.Data.AIs.find( item => item.id === AI_id )
			: null;
		setState.UIControls.manage_AIs.edit_AI_modal( {
			visible ,
			mode : AI_id ? 'edit' : 'add' ,
			editing_id : AI_id || null ,
			fields : targetFields
				? checkAs<AI.EditAIItem>( _.cloneDeep( targetFields ) )
				: defaultAIFields(),
		} );
	};
	
	const rtn = {
		fetchSettings ,
		reloadSettings ,
		setSettings ,
		buildSettingsFromStore ,
		applySettings ,
		isDirty ,
		changeEditAIModalVisible ,
		submitSettings : ipcMethods.submitSettings ,
		exitSettings : ipcMethods.exitSettings ,
		turnToNextAiPage : ipcMethods.turnToNextAiPage ,
		turnToPreviousAiPage : ipcMethods.turnToPreviousAiPage ,
		/**
		 * 判断某个 AI 是否为新增未保存的
		 */
		isNewAI( id: string ): boolean {
			return !_committedAIIds.has( id );
		},
		/**
		 * 判断某个 AI 是否已修改但未保存
		 */
		isModifiedAI( id: string ): boolean {
			if( !_committedAIIds.has( id ) ) return false;
			const current = store.Data.AIs.find( ai => ai.id === id );
			if( !current ) return false;
			return JSON.stringify( current ) !== _committedAISnapshot.get( id );
		},
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

function defaultProxyConf():NetworkProxy.ProxyConfFields {
	return {
		protocol : 'http' ,
		hostname : '127.0.0.1' ,
		port : 7897 ,
		proxy_auth : false,
	};
}

function getBrowserSystemTheme():'light' | 'dark' {
	if( typeof window === 'undefined' || !window.matchMedia ) {
		return 'light';
	}
	return window.matchMedia( '(prefers-color-scheme: dark)' ).matches ? 'dark' : 'light';
}

function applyThemePreferenceToDocument(
	theme:Appearance.Theme = 'system' ,
	systemTheme:'light' | 'dark' = getBrowserSystemTheme(),
) {
	const resolvedTheme = resolveThemePreference( theme , systemTheme );
	document.documentElement.dataset.aiWebappThemeSource = theme;
	document.documentElement.dataset.aiWebappTheme = resolvedTheme;
}

function defaultGlobalProxyFields():NetworkProxy.GlobalProxyFields {
	return {
		...defaultProxyConf() ,
		no_proxy_for : [] ,
		no_proxy_for__enabled : true,
	};
}

function defaultProxyServers():NetworkProxy.ProxyServer.Server[] {
	return [
		{
			proxy_server_id : '1' ,
			server_name : 'Clash Verge Rev' ,
			proxy_conf : defaultProxyConf() ,
			enabled : true,
		} ,
		{
			proxy_server_id : '2' ,
			server_name : 'Clash For Windows' ,
			proxy_conf : {
				...defaultProxyConf() ,
				port : 7890,
			} ,
			enabled : true,
		},
	];
}

function defaultAIFields():AI.EditAIItem {
	return {
		label : '' ,
		AI_family : checkAs<AI.AIFamily>( 'chatgpt' ) ,
		url : 'https://chatgpt.com' ,
		url_override : null ,
		desc : '' ,
		preloadOnStartup : false ,
		proxy_mode : 'follow_global_setting' ,
		from_server_list_proxy : null ,
		user_fill_proxy : null,
	};
}

export type Reaxel_SettingsView = Pick<typeof reaxel_SettingsView , "mutate"|"store"|"setState">;

import { rehancer_Dev } from './rehancer_Dev';
import { reaxel_I18n } from "#src/Views/SettingsView/reaxels/i18n";
import { createSettingsIpcService } from '#src/Views/SettingsView/services/Settings';
import {
	normalizeConcreteLanguage ,
	normalizeThemePreference ,
	resolveLanguagePreference ,
	resolveThemePreference,
} from '#src/shared/appearance';
import type { Languages } from '#src/Types/Languages';
import type {
	Menus,
} from '#src/shared/structs/settings';
import type {
	Settings ,
	SettingsFetchResult,
} from '#src/Types/SettingsTypes';
import { AI } from "#src/Types/SettingsTypes/AI";
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
