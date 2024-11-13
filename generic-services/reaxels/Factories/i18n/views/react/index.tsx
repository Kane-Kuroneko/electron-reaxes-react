export const createI18nReactComponent = (reaxel_I18n:ReturnType<typeof Refaxel_I18n>) => {
	const {I18n_Store,statics} = reaxel_I18n();
	const sourceLanguage = statics.config.find( conf => conf.isSource ).language;
		
	return reaxper( ( props: React.PropsWithChildren<{}> ): React.ReactElement => {
		[ I18n_Store.language ];
		const children = props.children as string;
		const forceUpdate = utils.useforceUpdate();
		const [ prevLangText , prevLang ] = [ useRef<string>() , useRef<string>( I18n_Store.language ) ];
		
		/*暂时不要移除,监测组件是否被不正常地卸载*/
		useEffect( () => {
			// console.log( 'mounted' );
			// return () => console.log( 'unmounted' );
		} , [] );
		
		useEffect( () => {
			forceUpdate();
		} , [ I18n_Store.loading ] );
		
		if( I18n_Store.language === sourceLanguage ) {
			prevLangText.current = children;
			prevLang.current = sourceLanguage;
			return <>{ children }</>;
		}
		
		if( !statics.languageMaps[I18n_Store.language] ) {
			return <>{ prevLangText.current || children }</>;
		} else {
			prevLangText.current = statics.languageMaps[I18n_Store.language][children];
			prevLang.current = I18n_Store.language;
			return <>{ statics.languageMaps[I18n_Store.language][children] }</>;
		}
	} );
}

import { Refaxel_I18n } from '../../';
import * as utils from '../../../../../utils';
