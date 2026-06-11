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
				{
					label : 'About' ,
					value : checkAs<Menus>( 'about' ),
				},
			],
		} ,
		UIControls : {
			networks : {
				proxy_mode : checkAs<NetworkProxy.GlobalProxyMode>( 'direct' ) ,
				using_proxy_server_id : checkAs<string>( null ) ,
				proxy_fields : defaultGlobalProxyFields() ,
				check_connection : {
					modal_visible : false ,
					address : '' ,
					pending : false ,
					success : false ,
					error : null,
				} ,
				proxy_test_urls : defaultProxyTestURLs(),
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
				startupAIPageLoadMode : checkAs<Startup.AIPageLoadMode>( 'last-used-ai' ) ,
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
			systemLanguage : checkAs<Languages>( 'en-US' ) ,
			systemTheme : checkAs<'light' | 'dark'>( 'light' ),
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

	// dirty 状态追踪: 存储上次加载/应用成功后的设置快照
	let _lastSavedSnapshot = '';
	// 已提交(已生效)的 AI IDs 集合，用于前端判断哪些 AI 是新增未保存的
	let _committedAIIds = new Set<string>();
	// 已提交的 AI 快照，用于判断是否已修改
	let _committedAISnapshot = new Map<string , string>();
	let _proxyTestURLSubmitQueue:Promise<unknown> = Promise.resolve();
	
	function updateSnapshot() {
		_lastSavedSnapshot = JSON.stringify( buildDirtySettingsSnapshot() );
		// 同步更新 committed AI 状态
		_committedAIIds = new Set( store.Data.AIs.map( ai => ai.id ) );
		_committedAISnapshot = new Map(
			store.Data.AIs.map( ai => [ ai.id , JSON.stringify( ai ) ] ),
		);
	}
	
	function isDirty(): boolean {
		if( !_lastSavedSnapshot ) return false;
		return JSON.stringify( buildDirtySettingsSnapshot() ) !== _lastSavedSnapshot;
	}

	function buildDirtySettingsSnapshot() {
		const settings = buildSettingsFromStore();
		// 测试 URL 是输入时即时持久化字段，不参与底部 Apply/Save 的 dirty 判断。
		delete ( settings.networks as Partial<Settings['networks']> ).proxy_test_urls;
		return settings;
	}
	
	~async function loadSettingsOnStartup() {
		await reloadSettings();
	}();
	
	if( typeof window !== 'undefined' && window.matchMedia ) {
		const darkSchemeQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
		darkSchemeQuery.addEventListener?.( 'change' , () => {
			// matchMedia 只作为变化信号，系统主题值通过 IPC 从主进程获取。
			void refreshAppearanceEnvironment();
		} );
	}

	async function fetchSettings() {
		return await fetchSettingsService();
	}
	
	async function reloadSettings() {
		setState.get_settings_status( {
			pending : true ,
			error : false,
		} );
		try {
			const [ environment , settings ] = await Promise.all( [
				getAppearanceEnvironment(),
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

	async function refreshAppearanceEnvironment() {
		try {
			const environment = await getAppearanceEnvironment();
			setState.Environment( environment );
			if( store.UIControls.appearance.theme === 'system' ) {
				applyThemePreferenceToDocument( 'system' , environment.systemTheme );
			}
			return environment;
		} catch ( error ) {
			console.error( '[SettingsView] Failed to refresh appearance environment:' , error );
			return store.Environment;
		}
	}
	
	function setSettings( settings:SettingsFetchResult | Settings ) {
		const proxyServerList = settings.networks.proxy_server_list || defaultProxyServers();
		setState.UIControls.networks( {
			proxy_mode : settings.networks.global_proxy.proxy_mode ,
			using_proxy_server_id : getEnabledProxyServerId(
				settings.networks.global_proxy.proxy_server_id || null ,
				proxyServerList,
			) ,
			proxy_fields : {
				...defaultGlobalProxyFields() ,
				...( settings.networks.global_proxy.user_fill_proxy || {} ),
			} ,
			proxy_server_list : proxyServerList,
			proxy_test_urls : {
				...defaultProxyTestURLs() ,
				...( settings.networks.proxy_test_urls || {} ),
			},
		} );
		setState.UIControls.appearance( {
			darkmode : settings.appearance.darkmode ,
			theme : settings.appearance.theme || normalizeThemePreference( undefined , settings.appearance.darkmode ) ,
			language : settings.appearance.language,
		} );
		setState.UIControls.system( settings.system );
		setState.UIControls.manage_AIs( {
			startupAIPageLoadMode : settings.startup?.aiPageLoadMode || 'last-used-ai',
		} );
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
		previewPromptAppearance( {
			theme : settings.appearance.theme ,
			language : settings.appearance.language,
		} );
		
		// 更新快照，用于 dirty 状态检测
		updateSnapshot();
	}

	async function setTheme( theme:Appearance.Theme ) {
		const environment = theme === 'system'
			? await refreshAppearanceEnvironment()
			: store.Environment;
		const resolvedTheme = resolveThemePreference( theme , environment.systemTheme );
		setState.UIControls.appearance( {
			theme ,
			darkmode : resolvedTheme === 'dark',
		} );
		applyThemePreferenceToDocument( theme , environment.systemTheme );
		previewPromptAppearanceFromStore( {
			theme,
		} );
	}

	function setLanguage( language:Appearance.Language ) {
		setState.UIControls.appearance( { language } );
		reaxel_I18n().setLanguage(resolveLanguagePreference(
			language ,
			store.Environment.systemLanguage,
		) as any);
		previewPromptAppearanceFromStore( { language } );
	}
	
	function buildSettingsFromStore():Settings {
		const networks = store.UIControls.networks;
		const raw = {
			networks : {
				global_proxy : {
					proxy_mode : networks.proxy_mode ,
					proxy_server_id : getEnabledProxyServerId(
						networks.using_proxy_server_id ,
						networks.proxy_server_list,
					) ,
					user_fill_proxy : {
						...defaultGlobalProxyFields() ,
						...networks.proxy_fields ,
						no_proxy_for : networks.proxy_fields.no_proxy_for || [] ,
						no_proxy_for__enabled : networks.proxy_fields.no_proxy_for__enabled !== false,
					},
				} ,
				proxy_server_list : networks.proxy_server_list,
				proxy_test_urls : networks.proxy_test_urls,
			} ,
			AIs : store.Data.AIs.map( ai => ( {
				...ai ,
				from_server_list_proxy : getEnabledProxyServerId(
					ai.from_server_list_proxy ,
					networks.proxy_server_list,
				),
			} ) ) ,
			system : store.UIControls.system ,
			startup : {
				aiPageLoadMode : store.UIControls.manage_AIs.startupAIPageLoadMode,
			} ,
			appearance : {
				darkmode : store.UIControls.appearance.darkmode ,
				theme : store.UIControls.appearance.theme ,
				language : store.UIControls.appearance.language,
			},
		};
		// 去除 observable 包装, 使数据可通过 IPC 结构化克隆传输。
		return cloneForIPC( raw );
	}
	
	async function applySettings() {
		setState.submit_settings_status( {
			pending : true ,
			error : false,
		} );
		try {
			const result = await applySettingsService( buildSettingsFromStore() );
			if( result.success ) {
				await reloadSettings();
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
				? checkAs<AI.EditAIItem>( cloneForIPC( targetFields ) )
				: defaultAIFields(),
		} );
	};

	const changeCloneAIModalVisible = (AI_id:string) => {
		const targetFields = store.Data.AIs.find( item => item.id === AI_id );
		if( !targetFields ) return;
		setState.UIControls.manage_AIs.edit_AI_modal( {
			visible : true ,
			mode : 'add' ,
			editing_id : null ,
			fields : checkAs<AI.EditAIItem>( cloneForIPC( {
				label : targetFields.label ,
				AI_family : targetFields.AI_family ,
				url : targetFields.url ,
				url_override : targetFields.url_override ,
				desc : targetFields.desc ,
				preloadOnStartup : targetFields.preloadOnStartup ,
				proxy_mode : targetFields.proxy_mode ,
				from_server_list_proxy : targetFields.from_server_list_proxy ,
				user_fill_proxy : targetFields.user_fill_proxy,
			} ) ),
		} );
	};
	
	const setAIEnabled = (id:string , enabled:boolean) => {
		mutate.Data( state => {
			state.AIs = state.AIs.map( ai => ai.id === id
				? {
					...ai ,
					disabled : !enabled,
				}
				: ai );
		} );
	};

	const createDefaultAIName = (family:AI.AIFamily , excludeId?:string | null) => {
		return buildDefaultAIName( family , store.Data.AIs , excludeId );
	};

	const setStartupAIPageLoadMode = (aiPageLoadMode:Startup.AIPageLoadMode) => {
		setState.UIControls.manage_AIs( { startupAIPageLoadMode : aiPageLoadMode } );
	};

	const setProxyTestURL = async( target:NetworkProxy.ProxyTestTarget , url:string ) => {
		const nextProxyTestURLs:NetworkProxy.ProxyTestURLs = {
			...store.UIControls.networks.proxy_test_urls ,
			[target] : url,
		};
		setState.UIControls.networks( {
			proxy_test_urls : nextProxyTestURLs,
		} );
		_proxyTestURLSubmitQueue = _proxyTestURLSubmitQueue
			.catch( () => null )
			.then( async() => {
				const payload = cloneForIPC( nextProxyTestURLs );
				const result = await submitSettings( '/networks/proxy_test_urls' , payload );
				if( !result.success ) {
					throw new Error( result.error || 'Failed to save proxy test URLs' );
				}
				return result;
			} );
		return _proxyTestURLSubmitQueue;
	};

	const rtn = {
		fetchSettings ,
		reloadSettings ,
		setSettings ,
		refreshAppearanceEnvironment ,
		setTheme ,
		setLanguage ,
		buildSettingsFromStore ,
		applySettings ,
		isDirty ,
		changeEditAIModalVisible ,
		changeCloneAIModalVisible ,
		setAIEnabled ,
		createDefaultAIName ,
		setStartupAIPageLoadMode ,
		setProxyTestURL ,
		submitSettings ,
		exitSettings ,
		turnToNextAiPage ,
		turnToPreviousAiPage ,
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

function applyThemePreferenceToDocument(
	theme:Appearance.Theme = 'system' ,
	systemTheme:'light' | 'dark' = 'light',
) {
	const resolvedTheme = resolveThemePreference( theme , systemTheme );
	document.documentElement.dataset.chataioThemeSource = theme;
	document.documentElement.dataset.chataioTheme = resolvedTheme;
}

function previewPromptAppearance(appearance:PromptView.Appearance) {
	previewPromptViewAppearance( appearance );
}

function previewPromptAppearanceFromStore(appearance:Partial<PromptView.Appearance>) {
	previewPromptAppearance( {
		theme : appearance.theme || reaxel_SettingsView.store.UIControls.appearance.theme ,
		language : appearance.language || reaxel_SettingsView.store.UIControls.appearance.language,
	} );
}

function defaultAIFields():AI.EditAIItem {
	return {
		label : '' ,
		AI_family : checkAs<AI.AIFamily>( 'custom' ) ,
		url : '' ,
		url_override : null ,
		desc : '' ,
		preloadOnStartup : false ,
		proxy_mode : 'follow_global_setting' ,
		from_server_list_proxy : null ,
		user_fill_proxy : null,
	};
}

function getEnabledProxyServerId(
	proxyServerId:string | null | undefined ,
	proxyServerList:NetworkProxy.ProxyServer.Server[],
) {
	return proxyServerList.some( server => {
		return server.enabled !== false && server.proxy_server_id === proxyServerId;
	} )
		? proxyServerId
		: null;
}

const AINameSuffixPool = [
	'Anselm' ,
	'Leopold' ,
	'Florian' ,
	'Dietrich' ,
	'Ludwig' ,
	'Frieda' ,
	'Odette' ,
	'Colette' ,
	'Mireille' ,
	'Bastien' ,
	'Lucien' ,
	'Claudine' ,
	'Cosimo' ,
	'Ludovico' ,
	'Vittorio' ,
	'Marcello' ,
	'Fiorella' ,
	'Ginevra',
] as const;

const AINameFamilyPrefix:Record<AI.AIFamily , string> = {
	chatgpt : 'ChatGPT' ,
	grok : 'Grok' ,
	gemini : 'Gemini' ,
	deepseek : 'DeepSeek' ,
	perplexity : 'Perplexity' ,
	claude : 'Claude' ,
	custom : 'Custom AI' ,
	'dev-proxy-test' : 'Proxy Test',
};

function buildDefaultAIName(family:AI.AIFamily , AIs:AI.AIItem[] , excludeId?:string | null) {
	const prefix = AINameFamilyPrefix[family] || family;
	const normalizedExistingNames = AIs
		.filter( ai => ai.id !== excludeId )
		.map( ai => ai.label.trim().toLowerCase() )
		.filter( Boolean );
	const suffix = AINameSuffixPool.find( name => {
		const normalizedName = name.toLowerCase();
		return !normalizedExistingNames.some( existing => existing.includes( normalizedName ) );
	} );

	if( suffix ) {
		return `${ prefix }-${ suffix }`;
	}

	let index = 2;
	while( normalizedExistingNames.some( existing => existing.includes( `${ prefix }-${ index }`.toLowerCase() ) ) ) {
		index++;
	}
	return `${ prefix }-${ index }`;
}

export type Reaxel_SettingsView = Pick<typeof reaxel_SettingsView , "mutate"|"store"|"setState">;

import { rehancer_Dev } from './rehancer_Dev';
import { reaxel_I18n } from "#src/Views/SettingsView/reaxels/i18n";
import {
	applySettings as applySettingsService ,
	exitSettings ,
	fetchSettings as fetchSettingsService ,
	getAppearanceEnvironment ,
	previewPromptViewAppearance ,
	submitSettings ,
	turnToNextAiPage ,
	turnToPreviousAiPage,
} from '#src/Views/SettingsView/services/Settings';
import {
	normalizeThemePreference ,
	resolveLanguagePreference ,
	resolveThemePreference,
} from '#src/shared/appearance';
import { cloneForIPC } from '#src/shared/utils/clone-for-ipc.utility';
import {
	createDefaultGlobalProxy as defaultGlobalProxyFields ,
	createDefaultProxyConf as defaultProxyConf ,
	createDefaultProxyServers as defaultProxyServers,
	createDefaultProxyTestURLs as defaultProxyTestURLs,
} from '#src/shared/statics/default-proxy';
import type { Languages } from '#src/Types/Languages';
import type { PromptView } from '#src/Types/PromptView';
import type {
	Menus,
} from '#src/shared/structs/settings';
import type {
	Settings ,
	SettingsFetchResult,
} from '#src/Types/SettingsTypes';
import { AI } from "#src/Types/SettingsTypes/AI";
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
import type { Startup } from "#src/Types/SettingsTypes/Startup";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
