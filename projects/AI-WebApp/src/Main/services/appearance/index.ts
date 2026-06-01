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

export const getAppearanceEnvironment = ():AppearanceEnvironment => {
	const systemLanguage = normalizeConcreteLanguage( app.getLocale() );
	const systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
	return {
		systemLanguage ,
		systemTheme ,
		systemLanguageName : getLanguageDisplayName( systemLanguage ),
	};
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
		`--ai-webapp-theme-source=${ resolvedAppearance.themeSource }`,
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

import {
	buildAcceptLanguages ,
	getLanguageDisplayName ,
	normalizeConcreteLanguage ,
	normalizeLanguagePreference ,
	normalizeThemePreference ,
	resolveLanguagePreference ,
	resolveThemePreference,
} from '#src/shared/appearance';
import type { Settings } from '#src/Types/SettingsTypes';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import type { Languages } from '#src/Types/Languages';
import {
	app ,
	nativeTheme ,
	type Session ,
	type WebContentsView,
} from 'electron';
