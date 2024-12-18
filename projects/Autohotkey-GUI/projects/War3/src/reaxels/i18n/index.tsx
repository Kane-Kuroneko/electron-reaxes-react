export let reaxel_I18n = reaxel(() => {
	
	let i18n = Refaxel_I18n( [
		{
			language : 'zh-CN' ,
			resourceLoader : () => import('./langs/zh-CN').then(m => m.default) ,
			name : '简体中文' ,
		},
		{
			language : 'zh-TW' ,
			resourceLoader : () => import('./langs/zh-TW').then(m => m.default) ,
			name : '正體中文' ,
		},
		{
			language : 'ja-JP' ,
			resourceLoader : () => import('./langs/ja-JP').then(m => m.default) ,
			name : '日本語' ,
		},
		{
			language : 'ko-KR' ,
			resourceLoader : () => import('./langs/ko-KR').then(m => m.default) ,
			name : '한국어' ,
		},
		{
			language : 'en-US' ,
			isSource:true,
			name : '英文(美国)' ,
		} ,
	]);
	
	i18n = i18nEnhancer_Storage({})(i18n);
	
	if(isElectron) {
		import('../../ENV/electron').then( ( m ) => {
			m?.IPC?.on( 'json' , ( e , json ) => {
				if( json.type === 'system-info' && json.data.systemLanguage ) {
					i18n().setLanguage( json.data.systemLanguage );
				}
			} );
		} );
	}
	
	return () => {
		return i18n();
	}
});

import { isElectron,env } from '../../ENV';
import { Refaxel_I18n , Languages } from '#generic/reaxels/Factories/i18n';
import { i18nEnhancer_Storage } from '#generic/reaxels/Factories/i18n/enhancers/storage';


