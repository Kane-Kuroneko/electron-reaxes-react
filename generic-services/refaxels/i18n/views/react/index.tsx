export const createI18nReactComponent = (reaxel_I18n:ReturnType<typeof Refaxel_I18n>) => {
	const { statics } = reaxel_I18n;
	const sourceLanguage = statics.config.find( conf => conf.isSource ).language;
		
	return reaxper( ( props: React.PropsWithChildren<{}> ): React.ReactElement => {
		[ reaxel_I18n.store.language ];
		const children = props.children as string;

		/*暂时不要移除,监测组件是否被不正常地卸载*/
		useEffect( () => {
			// console.log( 'mounted' );
			// return () => console.log( 'unmounted' );
		} , [] );
		
		if( reaxel_I18n.store.language === sourceLanguage ) {
			return <>{ children }</>;
		}
		
		const langMap = statics.languageMaps[reaxel_I18n.store.language];
		if( !langMap ) {
			// 语言资源加载中,保持显示原始文本
			return <>{ children }</>;
		}
		if( !langMap[children] ) {
			const langConfig = statics.config.find( c => c.language === reaxel_I18n.store.language );
			if( langConfig?.fallbackToOriginalText ) {
				return <>{ children }</>;
			}
			return <>ERR_I18NComponent_MISS_{reaxel_I18n.store.language}({children})</>;
		}
		return <>{ langMap[children] }</>;
	} );
}

import { reaxper } from 'reaxes-react';
import { useEffect } from 'react';
import { Refaxel_I18n } from '../../index';
