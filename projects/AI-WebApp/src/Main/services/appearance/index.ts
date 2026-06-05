export type AppearanceEnvironment = {
	systemLanguage: Languages;
	systemTheme: 'light' | 'dark';
	systemLanguageName: string;
};

export type ResolvedAppearance = {
	language: Languages;
	theme: 'light' | 'dark';
	themeSource: Appearance.Theme;
	acceptLanguages: string;
};

const sessionLanguageHandlers = new WeakMap<Session , string>();
const AIPageBackgroundColors:Record<'light' | 'dark' , string> = {
	light : '#ffffff' ,
	dark : '#111417',
};

export const getAppearanceEnvironment = ():AppearanceEnvironment => {
	const systemLanguage = getSystemLanguage();
	const systemTheme = getSystemTheme();
	return {
		systemLanguage ,
		systemTheme ,
		systemLanguageName : getLanguageDisplayName( systemLanguage ),
	};
};

const getSystemLanguage = ():Languages => {
	try {
		const preferredLanguages = app.getPreferredSystemLanguages();
		if( preferredLanguages.length ) {
			return resolvePreferredSystemLanguage( preferredLanguages );
		}
	} catch ( error ) {
		console.warn( '[Appearance] Failed to get preferred system languages:' , error );
	}
	return normalizeConcreteLanguage( app.getLocale() );
};

export const getAIPageBackgroundColorByTheme = (theme:'light' | 'dark') => {
	return AIPageBackgroundColors[theme];
};

export const getAIPageBackgroundColor = (appearance:Settings['appearance']) => {
	return getAIPageBackgroundColorByTheme( resolveAppearance( appearance ).theme );
};

export const resolveAppearance = (
	appearance:Settings['appearance'],
):ResolvedAppearance => {
	const environment = getAppearanceEnvironment();
	const language = resolveLanguagePreference(
		normalizeLanguagePreference( appearance.language ) ,
		environment.systemLanguage,
	);
	const theme = resolveThemePreference(
		normalizeThemePreference( appearance.theme , appearance.darkmode ) ,
		environment.systemTheme,
	);
	return {
		language ,
		theme ,
		themeSource : normalizeThemePreference( appearance.theme , appearance.darkmode ) ,
		acceptLanguages : buildAcceptLanguages( language ),
	};
};

export const applyElectronAppearance = (appearance:Settings['appearance']) => {
	const themeSource = normalizeThemePreference( appearance.theme , appearance.darkmode );
	nativeTheme.themeSource = themeSource;
	return resolveAppearance( {
		...appearance ,
		theme : themeSource,
	} );
};

export const applyAIPageAppearanceToView = (
	view:WebContentsView ,
	appearance:Settings['appearance'],
) => {
	const resolvedAppearance = resolveAppearance( appearance );
	view.setBackgroundColor( getAIPageBackgroundColorByTheme( resolvedAppearance.theme ) );
	const ses = view.webContents.session;
	installAcceptLanguageHeader( ses , resolvedAppearance.acceptLanguages );
	try {
		ses.setUserAgent( ses.getUserAgent() , resolvedAppearance.acceptLanguages );
	} catch ( error ) {
		console.warn( '[Appearance] Failed to set session accept languages:' , error );
	}
	return getAIPageAppearanceKey( resolvedAppearance );
};

export const getAIPagePreloadArguments = (appearance:Settings['appearance']) => {
	const resolvedAppearance = resolveAppearance( appearance );
	return [
		`--ai-webapp-language=${ resolvedAppearance.language }` ,
		`--ai-webapp-theme=${ resolvedAppearance.theme }` ,
		`--ai-webapp-theme-source=${ resolvedAppearance.themeSource }` ,
		`--ai-webapp-background-color=${ getAIPageBackgroundColorByTheme( resolvedAppearance.theme ) }`,
	];
};

export const getAIPageAppearanceKey = (appearance:ResolvedAppearance) => {
	return JSON.stringify( {
		language : appearance.language ,
		theme : appearance.theme ,
		themeSource : appearance.themeSource ,
		acceptLanguages : appearance.acceptLanguages,
	} );
};

const installAcceptLanguageHeader = (ses:Session , acceptLanguages:string) => {
	if( sessionLanguageHandlers.get( ses ) === acceptLanguages ) {
		return;
	}
	sessionLanguageHandlers.set( ses , acceptLanguages );
	ses.webRequest.onBeforeSendHeaders( ( details , callback ) => {
		details.requestHeaders['Accept-Language'] = acceptLanguages;
		callback( { requestHeaders : details.requestHeaders } );
	} );
};

const getSystemTheme = ():'light' | 'dark' => {
	// nativeTheme.themeSource 会覆盖 shouldUseDarkColors，这里只返回系统级主题。
	if( process.platform === 'darwin' ) {
		return getMacOSSystemTheme();
	}
	if(
		process.platform === 'win32'
		&& typeof nativeTheme.shouldUseDarkColorsForSystemIntegratedUI === 'boolean'
	) {
		return nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ? 'dark' : 'light';
	}
	return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
};

const getMacOSSystemTheme = ():'light' | 'dark' => {
	try {
		return systemPreferences.getUserDefault( 'AppleInterfaceStyle' , 'string' ) === 'Dark'
			? 'dark'
			: 'light';
	} catch ( error ) {
		return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
	}
};

import {
	buildAcceptLanguages ,
	getLanguageDisplayName ,
	normalizeConcreteLanguage ,
	normalizeLanguagePreference ,
	normalizeThemePreference ,
	resolvePreferredSystemLanguage ,
	resolveLanguagePreference ,
	resolveThemePreference,
} from '#src/shared/appearance';
import type { Settings } from '#src/Types/SettingsTypes';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import type { Languages } from '#src/Types/Languages';
import {
	app ,
	nativeTheme ,
	systemPreferences ,
	type Session ,
	type WebContentsView,
} from 'electron';
import process from 'node:process';
