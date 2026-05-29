export const Refaxel_I18n = function (
	config: Config[] ,
) {
	const { setState , mutate , store } = createReaxable( {
		language : null satisfies Languages ,
		//如果loading则是正在加载的语言的Promise
		loading : false as false | Promise<Languages> ,
	} );
	
	const languageMaps: LanguageMap = {};
	const sourceLanguage = config.find( conf => conf.isSource )?.language;
	if(_.isEmpty(sourceLanguage)){
		throw new Error( '传入的配置中必须有一项拥有<isSource>属性,它作为自然语言编写于代码中' );
	}
	
	//记录language被修改的次数,防止数据竞态:用户修改语言时异步加载A, 在此时切换语言B , 等到加载完成时又切回了A,所以后续会判断如果count有变化则加载脚本完成不再执行切换语言动作
	let languageChangeCount = 0;
	
	const setLanguage = ( lang: Languages ) => {
		languageChangeCount ++;
		const currentCount = languageChangeCount;
		
		const change = () => {
			if( currentCount !== languageChangeCount ) return;
			loadLanguage( lang );
			if( store.loading ) {
				store.loading.then( lang => {
					if( currentCount === languageChangeCount ){
						setState( { language : lang } );
					}
				} );
			}
		}
		
		if( !languageMaps.hasOwnProperty( lang ) && sourceLanguage !== lang ) {
			if( store.loading ) {
				store.loading.then( () => {
					change();
				} );
			} else {
				change();
			}
		} else {
			setState( { language : lang } );
		}
	};
	
	const loadLanguage = ( language: Languages ) => {
		const target = config.find( conf => conf.language === language );
		if( !target ) throw new Error( '[d4a5d45as4d5as] Language "' + language + '" not found in i18n config' );
		if( target.resourceMap ) {
			languageMaps[language] = target.resourceMap;
		} else if( target.resourceLoader ) {
			const loadingPromise = xPromise<Languages>();
			
			target.resourceLoader().
			then( ( resourceMap ) => {
				languageMaps[language] = resourceMap;
				loadingPromise.resolve( language );
			} ).
			catch( e => {
				console.error( e );
				loadingPromise.reject();
			} );
			
			loadingPromise.finally( () => {
				setState( { loading : false } );
			} );
			setState( {
				loading : loadingPromise ,
			} );
		}
		
	};
	
	
	setLanguage( sourceLanguage );
	
	const i18n = function(){

		return (langText:string) => {
			/*依赖收集,不要去掉否则有bug*/
			const lang = (store.loading,store.language);
			if(lang === sourceLanguage) return langText;

			if(languageMaps[lang] && languageMaps[lang][langText]){
				return languageMaps[lang][langText];
			} else {
				const langConfig = config.find( c => c.language === lang );
				if( langConfig?.fallbackToOriginalText ) {
					return langText;
				}
				return `ERR_I18N_MISS_${lang}(${langText})`;
			}
		};
	}()
	
	const rtn = {
		setLanguage ,
		i18n ,
		get language() {return store.language;} ,
		
	};
	
	return reaxel(() => {
		
		return Object.assign(() => rtn , {
			store ,
			setState ,
			mutate ,
			statics : {
				config,
				languageMaps,
			},
		});
	});
};






type LanguageMap = {
	[p in Languages]?: { [p: string]: string }
};


// const reaxel_I18n = Refaxel_I18n(
// 	[
// 		{
// 			name : '英语' ,
// 			isSource : true ,
// 			default : true ,
// 			language : 'en-US' as const ,
// 		} ,
// 		{
// 			name : '汉语' ,
// 			language : 'zh-CN' as const ,
// 			resourceLoader : () => import('./zh-CN.ts').then( m => m.default ) ,
// 		} ,
// 	] ,
// );
export type Config = /*common keys*/{
	//此项配置的语言的名字
	language: Languages,
	//是否默认以这种语言显示
	default?: boolean,
	//语言的名字,如果不设置则使用Language替代
	name?: string,
	//true:当目标语言的文本miss时,回退至无警告的原始text  false:不可用时将文本替换为ERR_I18N_MISS_<language>(originalText),以提示开发者补全国际化
	fallbackToOriginalText? : boolean,
} & (
	| {
	isSource: boolean;
	resourceMap?: never;
	resourceLoader?: never;
}

	| {
	resourceMap: { [p: string]: string };
	//是否懒加载,默认开启
	lazy? : boolean;
	isSource?: never;
	resourceLoader?: never;
}
	
	| {
	resourceLoader: () => Promise<{ [p: string]: string }>;
	lazy? : boolean;
	isSource?: never;
	resourceMap?: never
});


export const languages = {
	"en-US": {
		code: "en-US",
		locale: "en-us",
		legacyCode: "en_US",
		englishName: "English (United States)",
		genericName: "English",
		nativeName: "English (US)"
	},
	"en-GB": {
		code: "en-GB",
		locale: "en-gb",
		legacyCode: "en_GB",
		englishName: "English (United Kingdom)",
		genericName: "English",
		nativeName: "English (UK)"
	},
	"zh-CN": {
		code: "zh-CN",
		locale: "zh-cn",
		legacyCode: "zh_CN",
		englishName: "Simplified Chinese",
		genericName: "Chinese",
		nativeName: "简体中文"
	},
	"zh-TW": {
		code: "zh-TW",
		locale: "zh-tw",
		legacyCode: "zh_TW",
		englishName: "Traditional Chinese (Taiwan)",
		genericName: "Chinese",
		nativeName: "繁體中文（台灣）"
	},
	"zh-HK": {
		code: "zh-HK",
		locale: "zh-hk",
		legacyCode: "zh_HK",
		englishName: "Traditional Chinese (Hong Kong)",
		genericName: "Chinese",
		nativeName: "繁體中文（香港）"
	},
	"es-ES": {
		code: "es-ES",
		locale: "es-es",
		legacyCode: "es_ES",
		englishName: "Spanish (Spain)",
		genericName: "Spanish",
		nativeName: "Español (España)"
	},
	"es-MX": {
		code: "es-MX",
		locale: "es-mx",
		legacyCode: "es_MX",
		englishName: "Spanish (Mexico)",
		genericName: "Spanish",
		nativeName: "Español (México)"
	},
	"fr-FR": {
		code: "fr-FR",
		locale: "fr-fr",
		legacyCode: "fr_FR",
		englishName: "French (France)",
		genericName: "French",
		nativeName: "Français"
	},
	"de-DE": {
		code: "de-DE",
		locale: "de-de",
		legacyCode: "de_DE",
		englishName: "German (Germany)",
		genericName: "German",
		nativeName: "Deutsch"
	},
	"it-IT": {
		code: "it-IT",
		locale: "it-it",
		legacyCode: "it_IT",
		englishName: "Italian (Italy)",
		genericName: "Italian",
		nativeName: "Italiano"
	},
	"pt-PT": {
		code: "pt-PT",
		locale: "pt-pt",
		legacyCode: "pt_PT",
		englishName: "Portuguese (Portugal)",
		genericName: "Portuguese",
		nativeName: "Português (Portugal)"
	},
	"pt-BR": {
		code: "pt-BR",
		locale: "pt-br",
		legacyCode: "pt_BR",
		englishName: "Portuguese (Brazil)",
		genericName: "Portuguese",
		nativeName: "Português (Brasil)"
	},
	"ja-JP": {
		code: "ja-JP",
		locale: "ja-jp",
		legacyCode: "ja_JP",
		englishName: "Japanese",
		genericName: "Japanese",
		nativeName: "日本語"
	},
	"ko-KR": {
		code: "ko-KR",
		locale: "ko-kr",
		legacyCode: "ko_KR",
		englishName: "Korean",
		genericName: "Korean",
		nativeName: "한국어"
	},
	"ru-RU": {
		code: "ru-RU",
		locale: "ru-ru",
		legacyCode: "ru_RU",
		englishName: "Russian",
		genericName: "Russian",
		nativeName: "Русский"
	},
	"ar-SA": {
		code: "ar-SA",
		locale: "ar-sa",
		legacyCode: "ar_SA",
		englishName: "Arabic (Saudi Arabia)",
		genericName: "Arabic",
		nativeName: "العربية"
	},
	"tr-TR": {
		code: "tr-TR",
		locale: "tr-tr",
		legacyCode: "tr_TR",
		englishName: "Turkish",
		genericName: "Turkish",
		nativeName: "Türkçe"
	},
	"hi-IN": {
		code: "hi-IN",
		locale: "hi-in",
		legacyCode: "hi_IN",
		englishName: "Hindi (India)",
		genericName: "Hindi",
		nativeName: "हिन्दी"
	},
	"nl-NL": {
		code: "nl-NL",
		locale: "nl-nl",
		legacyCode: "nl_NL",
		englishName: "Dutch (Netherlands)",
		genericName: "Dutch",
		nativeName: "Nederlands"
	},
	"sv-SE": {
		code: "sv-SE",
		locale: "sv-se",
		legacyCode: "sv_SE",
		englishName: "Swedish",
		genericName: "Swedish",
		nativeName: "Svenska"
	},
	"pl-PL": {
		code: "pl-PL",
		locale: "pl-pl",
		legacyCode: "pl_PL",
		englishName: "Polish",
		genericName: "Polish",
		nativeName: "Polski"
	},
	"da-DK": {
		code: "da-DK",
		locale: "da-dk",
		legacyCode: "da_DK",
		englishName: "Danish",
		genericName: "Danish",
		nativeName: "Dansk"
	},
	"nb-NO": {
		code: "nb-NO",
		locale: "nb-no",
		legacyCode: "nb_NO",
		englishName: "Norwegian Bokmål",
		genericName: "Norwegian",
		nativeName: "Norsk bokmål"
	},
	"fi-FI": {
		code: "fi-FI",
		locale: "fi-fi",
		legacyCode: "fi_FI",
		englishName: "Finnish",
		genericName: "Finnish",
		nativeName: "Suomi"
	},
	"cs-CZ": {
		code: "cs-CZ",
		locale: "cs-cz",
		legacyCode: "cs_CZ",
		englishName: "Czech",
		genericName: "Czech",
		nativeName: "Čeština"
	},
	"sk-SK": {
		code: "sk-SK",
		locale: "sk-sk",
		legacyCode: "sk_SK",
		englishName: "Slovak",
		genericName: "Slovak",
		nativeName: "Slovenčina"
	},
	"ro-RO": {
		code: "ro-RO",
		locale: "ro-ro",
		legacyCode: "ro_RO",
		englishName: "Romanian",
		genericName: "Romanian",
		nativeName: "Română"
	},
	"hu-HU": {
		code: "hu-HU",
		locale: "hu-hu",
		legacyCode: "hu_HU",
		englishName: "Hungarian",
		genericName: "Hungarian",
		nativeName: "Magyar"
	},
	"el-GR": {
		code: "el-GR",
		locale: "el-gr",
		legacyCode: "el_GR",
		englishName: "Greek",
		genericName: "Greek",
		nativeName: "Ελληνικά"
	},
	"he-IL": {
		code: "he-IL",
		locale: "he-il",
		legacyCode: "he_IL",
		englishName: "Hebrew",
		genericName: "Hebrew",
		nativeName: "עברית"
	},
	"th-TH": {
		code: "th-TH",
		locale: "th-th",
		legacyCode: "th_TH",
		englishName: "Thai",
		genericName: "Thai",
		nativeName: "ไทย"
	},
	"id-ID": {
		code: "id-ID",
		locale: "id-id",
		legacyCode: "id_ID",
		englishName: "Indonesian",
		genericName: "Indonesian",
		nativeName: "Bahasa Indonesia"
	},
	"ms-MY": {
		code: "ms-MY",
		locale: "ms-my",
		legacyCode: "ms_MY",
		englishName: "Malay",
		genericName: "Malay",
		nativeName: "Bahasa Melayu"
	},
	"vi-VN": {
		code: "vi-VN",
		locale: "vi-vn",
		legacyCode: "vi_VN",
		englishName: "Vietnamese",
		genericName: "Vietnamese",
		nativeName: "Tiếng Việt"
	},
	"fil-PH": {
		code: "fil-PH",
		locale: "fil-ph",
		legacyCode: "fil_PH",
		englishName: "Filipino",
		genericName: "Filipino",
		nativeName: "Wikang Filipino"
	},
	"bn-IN": {
		code: "bn-IN",
		locale: "bn-in",
		legacyCode: "bn_IN",
		englishName: "Bengali (India)",
		genericName: "Bengali",
		nativeName: "বাংলা"
	},
	"pa-IN": {
		code: "pa-IN",
		locale: "pa-in",
		legacyCode: "pa_IN",
		englishName: "Punjabi",
		genericName: "Punjabi",
		nativeName: "ਪੰਜਾਬੀ"
	},
	"kn-IN": {
		code: "kn-IN",
		locale: "kn-in",
		legacyCode: "kn_IN",
		englishName: "Kannada",
		genericName: "Kannada",
		nativeName: "ಕನ್ನಡ"
	},
	"ml-IN": {
		code: "ml-IN",
		locale: "ml-in",
		legacyCode: "ml_IN",
		englishName: "Malayalam",
		genericName: "Malayalam",
		nativeName: "മലയാളം"
	},
	"te-IN": {
		code: "te-IN",
		locale: "te-in",
		legacyCode: "te_IN",
		englishName: "Telugu",
		genericName: "Telugu",
		nativeName: "తెలుగు"
	},
	"mr-IN": {
		code: "mr-IN",
		locale: "mr-in",
		legacyCode: "mr_IN",
		englishName: "Marathi",
		genericName: "Marathi",
		nativeName: "मराठी"
	},
	"gu-IN": {
		code: "gu-IN",
		locale: "gu-in",
		legacyCode: "gu_IN",
		englishName: "Gujarati",
		genericName: "Gujarati",
		nativeName: "ગુજરાતી"
	},
	"ta-IN": {
		code: "ta-IN",
		locale: "ta-in",
		legacyCode: "ta_IN",
		englishName: "Tamil",
		genericName: "Tamil",
		nativeName: "தமிழ்"
	},
	"ne-NP": {
		code: "ne-NP",
		locale: "ne-np",
		legacyCode: "ne_NP",
		englishName: "Nepali",
		genericName: "Nepali",
		nativeName: "नेपाली"
	},
	"si-LK": {
		code: "si-LK",
		locale: "si-lk",
		legacyCode: "si_LK",
		englishName: "Sinhala",
		genericName: "Sinhala",
		nativeName: "සිංහල"
	},
	"km-KH": {
		code: "km-KH",
		locale: "km-kh",
		legacyCode: "km_KH",
		englishName: "Khmer",
		genericName: "Khmer",
		nativeName: "ភាសាខ្មែរ"
	},
	"lo-LA": {
		code: "lo-LA",
		locale: "lo-la",
		legacyCode: "lo_LA",
		englishName: "Lao",
		genericName: "Lao",
		nativeName: "ລາວ"
	},
	"my-MM": {
		code: "my-MM",
		locale: "my-mm",
		legacyCode: "my_MM",
		englishName: "Burmese",
		genericName: "Burmese",
		nativeName: "မြန်မာဘာသာ"
	},
	"bo-CN": {
		code: "bo-CN",
		locale: "bo-cn",
		legacyCode: "bo_CN",
		englishName: "Tibetan",
		genericName: "Tibetan",
		nativeName: "བོད་ཡིག"
	},
	"hr-HR": {
		code: "hr-HR",
		locale: "hr-hr",
		legacyCode: "hr_HR",
		englishName: "Croatian",
		genericName: "Croatian",
		nativeName: "Hrvatski"
	},
	"sr-RS": {
		code: "sr-RS",
		locale: "sr-rs",
		legacyCode: "sr_RS",
		englishName: "Serbian",
		genericName: "Serbian",
		nativeName: "Српски"
	},
	"bs-BA": {
		code: "bs-BA",
		locale: "bs-ba",
		legacyCode: "bs_BA",
		englishName: "Bosnian",
		genericName: "Bosnian",
		nativeName: "Bosanski"
	},
	"mk-MK": {
		code: "mk-MK",
		locale: "mk-mk",
		legacyCode: "mk_MK",
		englishName: "Macedonian",
		genericName: "Macedonian",
		nativeName: "Македонски"
	},
	"sq-AL": {
		code: "sq-AL",
		locale: "sq-al",
		legacyCode: "sq_AL",
		englishName: "Albanian",
		genericName: "Albanian",
		nativeName: "Shqip"
	},
	"is-IS": {
		code: "is-IS",
		locale: "is-is",
		legacyCode: "is_IS",
		englishName: "Icelandic",
		genericName: "Icelandic",
		nativeName: "Íslenska"
	},
	"lv-LV": {
		code: "lv-LV",
		locale: "lv-lv",
		legacyCode: "lv_LV",
		englishName: "Latvian",
		genericName: "Latvian",
		nativeName: "Latviešu"
	},
	"et-EE": {
		code: "et-EE",
		locale: "et-ee",
		legacyCode: "et_EE",
		englishName: "Estonian",
		genericName: "Estonian",
		nativeName: "Eesti"
	},
	"lt-LT": {
		code: "lt-LT",
		locale: "lt-lt",
		legacyCode: "lt_LT",
		englishName: "Lithuanian",
		genericName: "Lithuanian",
		nativeName: "Lietuvių"
	},
	"el-CY": {
		code: "el-CY",
		locale: "el-cy",
		legacyCode: "el_CY",
		englishName: "Greek (Cyprus)",
		genericName: "Greek",
		nativeName: "Ελληνικά (Κύπρος)"
	}
} as const;

export type Languages = keyof typeof languages;

import _ from 'lodash';
import { createReaxable , reaxel } from 'reaxes';
import { xPromise } from 'reaxes-utils';

