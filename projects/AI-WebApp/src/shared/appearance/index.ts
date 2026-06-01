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

export const normalizeConcreteLanguage = (language?:string):Languages => {
	if( !language ) return 'en-US';
	const normalized = language.replace( '_' , '-' );
	const exact = concreteLanguages.find( item => item.toLowerCase() === normalized.toLowerCase() );
	if( exact ) return exact;
	const base = normalized.split( '-' )[0].toLowerCase();
	if( base === 'zh' ) {
		return normalized.toLowerCase().includes( 'tw' ) || normalized.toLowerCase().includes( 'hk' )
			? 'zh-TW'
			: 'zh-CN';
	}
	if( base === 'ja' ) return 'ja-JP';
	if( base === 'ko' ) return 'ko-KR';
	return 'en-US';
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

import type { Languages } from '#src/Types/Languages';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
