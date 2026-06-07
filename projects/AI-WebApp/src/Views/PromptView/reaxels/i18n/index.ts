const isElectron = typeof window !== 'undefined' && !!window.api;

export let reaxel_I18n = reaxel(() => {
	let i18n = Refaxel_I18n([
		{
			language : 'zh-CN' ,
			resourceLoader : () => import('#src/Views/SettingsView/reaxels/i18n/langs/zh-CN').then( m => m.default ) ,
			name : '简体中文',
		} ,
		{
			language : 'zh-TW' ,
			resourceLoader : () => import('#src/Views/SettingsView/reaxels/i18n/langs/zh-TW').then( m => m.default ) ,
			name : '正體中文',
		} ,
		{
			language : 'ja-JP' ,
			resourceLoader : () => import('#src/Views/SettingsView/reaxels/i18n/langs/ja-JP').then( m => m.default ) ,
			name : '日本語',
		} ,
		{
			language : 'ko-KR' ,
			resourceLoader : () => import('#src/Views/SettingsView/reaxels/i18n/langs/ko-KR').then( m => m.default ) ,
			name : '한국어',
		} ,
		{
			language : 'en-US' ,
			isSource : true ,
			name : 'English(US)',
		},
	]);
	
	if( !isElectron ) {
		i18n = rehance_I18n_Persist( {} )( i18n );
	}
	
	const rtn = {
		get setLanguage() {
			return i18n().setLanguage;
		} ,
		get i18n() {
			return i18n().i18n;
		} ,
		get language() {
			return i18n().language;
		},
	};
	
	return Object.assign( () => rtn , {
		store : i18n.store ,
		setState : i18n.setState ,
		mutate : i18n.mutate ,
		statics : {
			...i18n.statics,
		},
	} );
} );

import { Refaxel_I18n } from '#generics/refaxels/i18n';
import { rehance_I18n_Persist } from '#generics/refaxels/i18n/rehancers/storage';
import { reaxel } from 'reaxes';
