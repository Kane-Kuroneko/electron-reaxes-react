export const reaxel_GuidingView = reaxel( () => {
	const initialSystemLanguage = checkAs<Languages>( 'en-US' );
	const { store , setState , mutate } = createReaxable( {
		Page : {
			current : 0,
		} ,
		UIControls : {
			appearance : {
				language : checkAs<Appearance.Language>( 'follow-system' ) ,
				theme : checkAs<Appearance.Theme>( 'system' ),
			} ,
			network : {
				status : checkAs<Guiding.NetworkStatus>( 'unknown' ),
			} ,
			ai : {
				selectedAIIds : checkAs<string[]>( [] ) ,
				customAIFields : {
					label : '' ,
					url : '',
				},
			},
		} ,
		Data : {
			defaults : checkAs<Guiding.Defaults>( null ) ,
			testResult : checkAs<Guiding.ConnectivityResult>( null ) ,
			customAIs : checkAs<AI.AIItem[]>( [] ),
		} ,
		Environment : {
			systemLanguage : initialSystemLanguage ,
			systemLanguageName : getLanguageDisplayName( initialSystemLanguage ) ,
			systemTheme : checkAs<'light' | 'dark'>( 'light' ),
		} ,
		Status : {
			loading : true ,
			error : false ,
			testing : false ,
			finishing : false,
		},
	} );
	
	const ipcMethods = createGuidingIpcService();
	let initialized = false;

	syncI18nLanguage();
	
	if( typeof window !== 'undefined' && window.matchMedia ) {
		const darkSchemeQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
		darkSchemeQuery.addEventListener?.( 'change' , () => {
			// matchMedia 只作为变化信号，系统主题值通过 IPC 从主进程获取。
			void refreshAppearanceEnvironment();
		} );
	}
	
	async function init() {
		if( initialized ) {
			return;
		}
		initialized = true;
		await reloadDefaults();
	}
	
	async function reloadDefaults() {
		setState.Status( {
			loading : true ,
			error : false,
		} );
		try {
			const [ defaults , environment ] = await Promise.all( [
				ipcMethods.getDefaults() ,
				ipcMethods.getAppearanceEnvironment(),
			] );
			const systemLanguage = environment.systemLanguage;
			setState.Data( {
				defaults,
			} );
			setState.Environment( {
				systemLanguage ,
				systemLanguageName : environment.systemLanguageName ,
				systemTheme : environment.systemTheme,
			} );
			setState.UIControls.appearance( {
				language : defaults.appearance.language ,
				theme : defaults.appearance.theme,
			} );
			syncI18nLanguage( defaults.appearance.language , systemLanguage );
			setState.UIControls.ai( {
				selectedAIIds : defaults.defaultAIs
					.filter( ai => !ai.disabled )
					.map( ai => ai.id ),
			} );
			setState.Status( {
				loading : false ,
				error : false,
			} );
			applyThemeToDocument( resolveThemePreference(
				defaults.appearance.theme ,
				environment.systemTheme,
			) );
		} catch ( error ) {
			console.error( '[GuidingView] Failed to load defaults:' , error );
			setState.Status( {
				loading : false ,
				error : true,
			} );
		}
	}
	
	function getResolvedTheme() {
		return resolveThemePreference(
			store.UIControls.appearance.theme ,
			store.Environment.systemTheme,
		);
	}
	
	function getResolvedLanguage() {
		return resolveLanguagePreference(
			store.UIControls.appearance.language ,
			store.Environment.systemLanguage,
		);
	}

	async function refreshAppearanceEnvironment() {
		try {
			const environment = await ipcMethods.getAppearanceEnvironment();
			setState.Environment( {
				systemLanguage : environment.systemLanguage ,
				systemLanguageName : environment.systemLanguageName ,
				systemTheme : environment.systemTheme,
			} );
			applyThemeToDocument( getResolvedTheme() );
			if( store.UIControls.appearance.language === 'follow-system' ) {
				syncI18nLanguage( 'follow-system' , environment.systemLanguage );
			}
			return environment;
		} catch ( error ) {
			console.error( '[GuidingView] Failed to refresh appearance environment:' , error );
			return store.Environment;
		}
	}

	function syncI18nLanguage(
		language = store.UIControls.appearance.language ,
		systemLanguage = store.Environment.systemLanguage,
	) {
		reaxel_GuidingI18n().setLanguage( resolveLanguagePreference(
			language ,
			systemLanguage,
		) as any );
	}
	
	function getCanDirectConnect() {
		if( store.UIControls.network.status === 'direct' ) {
			return true;
		}
		if( store.UIControls.network.status === 'blocked' ) {
			return false;
		}
		return null;
	}
	
	function getLanguageOptions() {
		return [
			{
				value : 'follow-system' ,
				label : `Follow System (${ store.Environment.systemLanguageName })`,
			} ,
			...concreteLanguages.map( language => ( {
				value : language ,
				label : getLanguageDisplayName( language ),
			} ) ),
		];
	}
	
	function setLanguage( language:Appearance.Language ) {
		setState.UIControls.appearance( { language } );
		syncI18nLanguage( language );
	}
	
	function setTheme( theme:Appearance.Theme ) {
		setState.UIControls.appearance( { theme } );
		applyThemeToDocument( resolveThemePreference( theme , store.Environment.systemTheme ) );
	}
	
	function setNetworkStatus( status:Guiding.NetworkStatus ) {
		setState.UIControls.network( { status } );
	}
	
	function setSelectedAIIds( selectedAIIds:string[] ) {
		setState.UIControls.ai( { selectedAIIds } );
	}
	
	function setCustomAIField(
		field:keyof typeof store.UIControls.ai.customAIFields ,
		value:string,
	) {
		setState.UIControls.ai.customAIFields( { [field] : value } );
	}
	
	function addCustomAI() {
		const label = store.UIControls.ai.customAIFields.label.trim();
		const url = store.UIControls.ai.customAIFields.url.trim();
		if( !label || !url ) {
			return;
		}
		const ai:AI.AIItem = {
			id : createCustomAIId() ,
			label ,
			disabled : false ,
			AI_family : 'custom' ,
			url ,
			url_override : null ,
			desc : '' ,
			proxy_mode : 'follow_global_setting' ,
			from_server_list_proxy : null ,
			user_fill_proxy : null ,
			preloadOnStartup : false,
		};
		mutate.Data( data => {
			data.customAIs = [ ...data.customAIs , ai ];
		} );
		setState.UIControls.ai( {
			customAIFields : {
				label : '' ,
				url : '',
			},
		} );
	}
	
	function removeCustomAI( id:string ) {
		mutate.Data( data => {
			data.customAIs = data.customAIs.filter( ai => ai.id !== id );
		} );
	}
	
	function buildProgress():Guiding.Progress {
		const canDirectConnect = getCanDirectConnect();
		const progress:Guiding.Progress = {
			appearance : {
				language : store.UIControls.appearance.language ,
				theme : store.UIControls.appearance.theme,
			},
		};
		if( store.UIControls.network.status !== 'unknown' ) {
			progress.network = {
				status : store.UIControls.network.status ,
				canDirectConnect,
			};
		}
		if( canDirectConnect && store.Data.defaults ) {
			progress.AIs = [
				...store.Data.defaults.defaultAIs.map( ai => ( {
					...ai ,
					disabled : !store.UIControls.ai.selectedAIIds.includes( ai.id ),
				} ) ) ,
				...store.Data.customAIs,
			];
		}
		return normalizeGuidingProgress( progress );
	}
	
	async function saveProgress( progress = buildProgress() ) {
		await ipcMethods.saveProgress( normalizeGuidingProgress( progress ) );
	}
	
	async function goNext() {
		if( store.Page.current === 0 ) {
			await saveProgress( {
				appearance : {
					language : store.UIControls.appearance.language ,
					theme : store.UIControls.appearance.theme,
				},
			} );
			setState.Page( { current : 1 } );
			return;
		}
		if( store.Page.current === 1 ) {
			await saveProgress();
			if( getCanDirectConnect() ) {
				setState.Page( { current : 2 } );
			}
		}
	}
	
	function goBack() {
		setState.Page( {
			current : Math.max( 0 , store.Page.current - 1 ),
		} );
	}
	
	async function finish( options:Partial<Guiding.FinishOptions> = {} ) {
		setState.Status( { finishing : true } );
		try {
			await ipcMethods.finish( {
				...options ,
				progress : buildProgress(),
			} );
		} finally {
			setState.Status( { finishing : false } );
		}
	}
	
	async function runConnectivityTest() {
		setState.Status( { testing : true } );
		try {
			const result = await ipcMethods.testConnectivity();
			setState.Data( { testResult : result } );
			setNetworkStatus( result.canDirectConnect ? 'direct' : 'blocked' );
		} finally {
			setState.Status( { testing : false } );
		}
	}
	
	const rtn = {
		init ,
		reloadDefaults ,
		refreshAppearanceEnvironment ,
		getResolvedTheme ,
		getResolvedLanguage ,
		getCanDirectConnect ,
		getLanguageOptions ,
		setLanguage ,
		setTheme ,
		setNetworkStatus ,
		setSelectedAIIds ,
		setCustomAIField ,
		addCustomAI ,
		removeCustomAI ,
		buildProgress ,
		saveProgress ,
		goNext ,
		goBack ,
		finish ,
		runConnectivityTest,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

function applyThemeToDocument( theme:'light' | 'dark' ) {
	document.documentElement.dataset.aiWebappTheme = theme;
	document.documentElement.style.colorScheme = theme;
}

function normalizeGuidingProgress(progress:Guiding.Progress):Guiding.Progress {
	return JSON.parse( JSON.stringify( progress ) );
}

function createCustomAIId() {
	return globalThis.crypto?.randomUUID?.() || `custom-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 8 ) }`;
}

export type Reaxel_GuidingView = Pick<typeof reaxel_GuidingView , "mutate"|"store"|"setState">;

import { createGuidingIpcService } from '#src/Views/GuidingView/services/Guiding';
import { reaxel_GuidingI18n } from '#src/Views/GuidingView/reaxels/i18n';
import {
	concreteLanguages ,
	getLanguageDisplayName ,
	resolveLanguagePreference ,
	resolveThemePreference,
} from '#src/shared/appearance';
import type { Guiding } from '#src/Types/Guiding';
import type { Languages } from '#src/Types/Languages';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import type { AI } from '#src/Types/SettingsTypes/AI';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
