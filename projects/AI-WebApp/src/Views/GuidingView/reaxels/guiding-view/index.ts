export const reaxel_GuidingView = reaxel( () => {
	const initialSystemLanguage = normalizeConcreteLanguage( navigator.language );
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
			systemTheme : checkAs<'light' | 'dark'>( getBrowserSystemTheme() ),
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
	
	if( typeof window !== 'undefined' && window.matchMedia ) {
		const darkSchemeQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
		darkSchemeQuery.addEventListener?.( 'change' , event => {
			const systemTheme = event.matches ? 'dark' : 'light';
			setState.Environment( { systemTheme } );
			applyThemeToDocument( getResolvedTheme() );
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
			const defaults = await ipcMethods.getDefaults();
			const systemLanguage = defaults.appearance.resolvedLanguage;
			setState.Data( {
				defaults,
			} );
			setState.Environment( {
				systemLanguage ,
				systemLanguageName : defaults.systemLanguageName ,
				systemTheme : defaults.appearance.resolvedTheme,
			} );
			setState.UIControls.appearance( {
				language : defaults.appearance.language ,
				theme : defaults.appearance.theme,
			} );
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
				defaults.appearance.resolvedTheme,
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
	
	function getCopy() {
		return reaxel_GuidingI18n().getCopy( getResolvedLanguage() );
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
		return progress;
	}
	
	async function saveProgress( progress = buildProgress() ) {
		await ipcMethods.saveProgress( progress );
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
		getResolvedTheme ,
		getResolvedLanguage ,
		getCopy ,
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

function getBrowserSystemTheme():'light' | 'dark' {
	if( typeof window === 'undefined' || !window.matchMedia ) {
		return 'light';
	}
	return window.matchMedia( '(prefers-color-scheme: dark)' ).matches ? 'dark' : 'light';
}

function applyThemeToDocument( theme:'light' | 'dark' ) {
	document.documentElement.dataset.aiWebappTheme = theme;
	document.documentElement.style.colorScheme = theme;
}

function createCustomAIId() {
	return globalThis.crypto?.randomUUID?.() || `custom-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 8 ) }`;
}

import { createGuidingIpcService } from '#src/Views/GuidingView/services/Guiding';
import { reaxel_GuidingI18n } from '#src/Views/GuidingView/reaxels/i18n';
import {
	concreteLanguages ,
	getLanguageDisplayName ,
	normalizeConcreteLanguage ,
	resolveLanguagePreference ,
	resolveThemePreference,
} from '#src/shared/appearance';
import type { Guiding } from '#src/Types/Guiding';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import type { AI } from '#src/Types/SettingsTypes/AI';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
