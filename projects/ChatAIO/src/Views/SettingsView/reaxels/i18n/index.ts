export let reaxel_I18n = createRendererI18nReaxel( [
	{
		language : 'zh-CN' ,
		name : '简体中文' ,
		resourceLoader : () => loadMergedLangResources(
			() => import( '#Views/shared/i18n/langs/zh-CN' ).then( ( m ) => m.default ) ,
			() => import( './langs/zh-CN' ).then( ( m ) => m.default ) ,
		) ,
	} ,
	{
		language : 'zh-TW' ,
		name : '正體中文' ,
		resourceLoader : () => loadMergedLangResources(
			() => import( '#Views/shared/i18n/langs/zh-TW' ).then( ( m ) => m.default ) ,
			() => import( './langs/zh-TW' ).then( ( m ) => m.default ) ,
		) ,
	} ,
	{
		language : 'ja-JP' ,
		name : '日本語' ,
		resourceLoader : () => loadMergedLangResources(
			() => import( '#Views/shared/i18n/langs/ja-JP' ).then( ( m ) => m.default ) ,
			() => import( './langs/ja-JP' ).then( ( m ) => m.default ) ,
		) ,
	} ,
	{
		language : 'ko-KR' ,
		name : '한국어' ,
		resourceLoader : () => loadMergedLangResources(
			() => import( '#Views/shared/i18n/langs/ko-KR' ).then( ( m ) => m.default ) ,
			() => import( './langs/ko-KR' ).then( ( m ) => m.default ) ,
		) ,
	} ,
	{
		language : 'en-US' ,
		isSource : true ,
		name : 'English(US)' ,
	} ,
] );


import { createRendererI18nReaxel } from '#Views/shared/i18n/create-renderer-i18n.reaxel';
import { loadMergedLangResources } from '#Views/shared/i18n/merge-lang-resources.utility';
