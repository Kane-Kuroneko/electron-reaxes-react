export const concreteLanguages = [
	'en-US' ,
	'zh-CN' ,
	'zh-TW' ,
	'ja-JP' ,
	'ko-KR',
] as const;

export const languageDisplayNames:Record<Languages , string> = {
	'en-US' : 'English' ,
	'zh-CN' : '简体中文' ,
	'zh-TW' : '正體中文' ,
	'ja-JP' : '日本語' ,
	'ko-KR' : '한국어',
};

export const normalizeSupportedConcreteLanguage = (language?:string):Languages | null => {
	if( !language ) return null;
	const normalized = language.replace( /_/g , '-' );
	const normalizedLower = normalized.toLowerCase();
	const exact = concreteLanguages.find( item => item.toLowerCase() === normalized.toLowerCase() );
	if( exact ) return exact;
	const base = normalizedLower.split( '-' )[0];
	if( base === 'en' ) return 'en-US';
	if( base === 'zh' ) {
		return normalizedLower.includes( 'tw' ) || normalizedLower.includes( 'hk' ) || normalizedLower.includes( 'hant' )
			? 'zh-TW'
			: 'zh-CN';
	}
	if( base === 'ja' ) return 'ja-JP';
	if( base === 'ko' ) return 'ko-KR';
	return null;
};

export const normalizeConcreteLanguage = (language?:string):Languages => {
	return normalizeSupportedConcreteLanguage( language ) || 'en-US';
};

export const resolvePreferredSystemLanguage = (
	languages?:readonly string[] | null ,
	fallback?:string,
):Languages => {
	for( const language of languages || [] ) {
		const normalized = normalizeSupportedConcreteLanguage( language );
		if( normalized ) return normalized;
	}
	return normalizeConcreteLanguage( fallback );
};

export const normalizeLanguagePreference = (language?:string):Appearance.Language => {
	if( language === 'follow-system' ) return 'follow-system';
	return normalizeConcreteLanguage( language );
};

export const normalizeThemePreference = (theme?:string , darkmode?:boolean):Appearance.Theme => {
	if( theme === 'light' || theme === 'dark' || theme === 'system' ) {
		return theme;
	}
	if( typeof darkmode === 'boolean' ) {
		return darkmode ? 'dark' : 'light';
	}
	return 'system';
};

export const resolveLanguagePreference = (
	language:Appearance.Language ,
	systemLanguage:Languages,
):Languages => {
	return language === 'follow-system' ? systemLanguage : normalizeConcreteLanguage( language );
};

export const resolveThemePreference = (
	theme:Appearance.Theme ,
	systemTheme:'light' | 'dark',
):'light' | 'dark' => {
	return theme === 'system' ? systemTheme : theme;
};

export const getLanguageDisplayName = (language:Languages) => {
	return languageDisplayNames[language] || languageDisplayNames['en-US'];
};

export const buildAcceptLanguages = (language:Languages) => {
	const base = language.split( '-' )[0];
	if( language === 'en-US' ) {
		return 'en-US,en;q=0.9';
	}
	if( base === 'zh' ) {
		return `${ language },${ base };q=0.9,en-US;q=0.8,en;q=0.7`;
	}
	return `${ language },${ base };q=0.9,en-US;q=0.8,en;q=0.7`;
};

export const buildNavigatorLanguages = (language:Languages) => {
	const base = language.split( '-' )[0];
	const languages = language === base
		? [ language ]
		: [ language , base , 'en-US' , 'en' ];
	return Array.from( new Set( languages ) );
};

import type { Languages } from '#src/Types/Languages';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
