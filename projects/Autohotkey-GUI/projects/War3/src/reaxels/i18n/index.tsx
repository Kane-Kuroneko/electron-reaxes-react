export let reaxel_I18n = Refaxel_I18n( [
	{
		language : 'zh-CN' ,
		resourceLoader : () => import('./langs/s-Chinese').then(m => m.default) ,
		name : '简体中文' ,
	},
	{
		language : 'en-US' ,
		isSource:true,
		name : '英文(美国)' ,
	} ,
]);

reaxel_I18n = i18nEnhancer_Storage({})(reaxel_I18n);


import { Refaxel_I18n } from '#generic/reaxels/Factories/i18n';
import { i18nEnhancer_Storage } from '#generic/reaxels/Factories/i18n/enhancers/storage';


