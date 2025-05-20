export let reaxel_I18n = reaxel(() => {
	
	let i18n = Refaxel_I18n([
		{
			language : 'zh-CN' ,
			resourceLoader : () => import('./langs/zh-CN').then(m => m.default) ,
			name : '简体中文' ,
		} ,
		{
			language : 'zh-TW' ,
			resourceLoader : () => import('./langs/zh-TW').then(m => m.default) ,
			name : '正體中文' ,
		} ,
		{
			language : 'ja-JP' ,
			resourceLoader : () => import('./langs/ja-JP').then(m => m.default) ,
			name : '日本語' ,
		} ,
		{
			language : 'ko-KR' ,
			resourceLoader : () => import('./langs/ko-KR').then(m => m.default) ,
			name : '한국어' ,
		} ,
		{
			language : 'en-US' ,
			isSource : true ,
			name : '英文(美国)' ,
		} ,
	]);
	
	i18n = rehance_I18n_Persist({})(i18n);
	
	if( isElectron ) {
		import('#renderer/ENV/electron').then(( m ) => {
			m?.IPC?.on('json::on' , ( e , json ) => {
				if( json.type === 'system-info' && json.data.systemLanguage ) {
					i18n().setLanguage(json.data.systemLanguage);
				}
			});
		});
	}
	
	const rtn = {
		get setLanguage(){
			return i18n().setLanguage;
		} ,
		get i18n(){
			return i18n().i18n;
		} ,
		get language(){
			return i18n().language;
		} ,
	};
	
	return Object.assign(() => rtn , {
		store : i18n.store ,
		setState : i18n.setState ,
		mutate : i18n.mutate ,
		statics : {
			...i18n.statics ,
		} ,
	});
});

import { isElectron , env } from '../../ENV';
import { Refaxel_I18n , Languages } from '#generic/refaxels/i18n';
import { rehance_I18n_Persist } from '#generic/refaxels/i18n/rehancers/storage';


