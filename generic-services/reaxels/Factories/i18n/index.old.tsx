import { reaxel_i18n_storage } from './i18n-storage';
import * as utils from '../../../utils';

/**
 * 分布式I18n reaxel
 * 如果不需要storage , 把reaxel_i18n_storage相关的部分移除即可.
 */
export const Reaxel_i18n = function(
	languageList = [] as {name:string,lang:string,module:any}[],
	souceLanguage:string = "en",
){
	
	const {store,setState} = orzMobx( {
		lang : souceLanguage ,
		loading : false,
	} );
	/*已经加载好的i18n文件*/
	const loadedLangMap = {};
	
	
	const asyncLangLoader = () => {
		if(store.lang === souceLanguage) return ;
		if(store.loading) return;
		const lang = store.lang;
		if ( !loadedLangMap[ lang ] ) {
			setState( {
				loading : true ,
			} );
			return languageList.find((item) => item.lang === lang).module().
			then( ( module ) => {
				const json = module.default;
				loadedLangMap[ lang ] = json;
			} ).finally(() => {
				setState( { loading : false } );
			});
		}
	}
	
	const changeLang = ( lang : string ) => {
		setState( {lang} );
		asyncLangLoader();
		document.documentElement.lang = lang.slice(0,2);
		setTimeout(() => i18n_storage.writeToStorage(lang));
	}
	
	const i18n = function(){
		let prevLang = souceLanguage;
		return (langText:string) => {
			/*依赖收集,不要去掉否则有bug*/
			const lang = (store.loading,store.lang);
			if(lang === souceLanguage) return langText;
			if(loadedLangMap[lang]){
				prevLang = lang;
				return loadedLangMap[lang][langText];
			} else {
				if(prevLang === souceLanguage) return langText;
				return loadedLangMap[ prevLang ][ langText ];
			}
		};
	}()
	
	const I18n = reaxper((props:React.PropsWithChildren<{}>):React.ReactElement => {
		[store.lang];
		const children = props.children as string;
		const forceUpdate = utils.useforceUpdate();
		const [prevLangText,prevLang] = [useRef<string>() , useRef<string>(store.lang)];
		
		/*暂时不要移除,监测组件是否被不正常地卸载*/
		useEffect(() => {
			// console.log( 'mounted' );
			// return () => console.log( 'unmounted' );
		},[])
		
		useEffect(() => {
			forceUpdate();
		},[store.loading]);
		
		if(store.lang === souceLanguage) {
			prevLangText.current = children;
			prevLang.current = souceLanguage;
			return <>{children}</> ;
		};
		if(!loadedLangMap[store.lang]){
			return <>{ prevLangText.current || children }</>;
		}else {
			prevLangText.current = loadedLangMap[store.lang][children];
			prevLang.current = store.lang;
			return <>{loadedLangMap[store.lang][children]}</>;
		}
	});
	
	const i18n_storage = reaxel_i18n_storage(changeLang);
	
	return () => {
		
		return {
			/*返回语言列表*/
			get languageList (){
				return languageList;
			},
			/*返回当前使用的语言缩写*/
			get language(){
				return store.lang;
			},
			get loading(){
				return store.loading;
			},
			i18n,
			/*修改语言方法,会重新渲染所有使用了此闭包内I18n的组件*/
			changeLang ,
			/*I18n组件,children直接放英语自然文本.*/
			I18n ,
		}
	}
};

