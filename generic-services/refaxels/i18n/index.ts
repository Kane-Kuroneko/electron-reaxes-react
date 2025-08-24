export const Refaxel_I18n = function (
	config: Config[] ,
) {
	const { setState , mutate , store } = createReaxable( {
		language : null as Languages ,
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
		
		const change = () => {
			const _languageChangeCount = languageChangeCount;
			loadLanguage( lang );
			if( store.loading ) {
				store.loading.then( lang => {
					if(_languageChangeCount === languageChangeCount){
						setState( { language : lang } );
						languageChangeCount ++;
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
			languageChangeCount ++;
		}
		
		document.documentElement.lang = lang;
	};
	
	const loadLanguage = ( language: Languages ) => {
		const target = config.find( conf => conf.language === language );
		if( !target ) throw new Error( 'd4a5d45as4d5as' );
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
				return `ERR_I18N_MISS_${lang}(${langText})`
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
// export type Languages = typeof enum_languages[keyof typeof enum_languages];
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


export const enum_languages = {
	'en_US' : 'en-US' , // 英语（美国）
	'en_GB' : 'en-GB' , // 英语（英国）
	'zh_CN' : 'zh-CN' , // 中文（简体）
	'zh_TW' : 'zh-TW' , // 中文（繁体，台湾）
	'zh_HK' : 'zh-HK' , // 中文（繁体，香港）
	'es_ES' : 'es-ES' , // 西班牙语（西班牙）
	'es_MX' : 'es-MX' , // 西班牙语（墨西哥）
	'fr_FR' : 'fr-FR' , // 法语（法国）
	'de_DE' : 'de-DE' , // 德语（德国）
	'it_IT' : 'it-IT' , // 意大利语（意大利）
	'pt_PT' : 'pt-PT' , // 葡萄牙语（葡萄牙）
	'pt_BR' : 'pt-BR' , // 葡萄牙语（巴西）
	'ja_JP' : 'ja-JP' , // 日语（日本）
	'ko_KR' : 'ko-KR' , // 韩语（韩国）
	'ru_RU' : 'ru-RU' , // 俄语（俄罗斯）
	'ar_SA' : 'ar-SA' , // 阿拉伯语（沙特阿拉伯）
	'tr_TR' : 'tr-TR' , // 土耳其语（土耳其）
	'hi_IN' : 'hi-IN' , // 印地语（印度）
	'nl_NL' : 'nl-NL' , // 荷兰语（荷兰）
	'sv_SE' : 'sv-SE' , // 瑞典语（瑞典）
	'pl_PL' : 'pl-PL' , // 波兰语（波兰）
	'da_DK' : 'da-DK' , // 丹麦语（丹麦）
	'no_NO' : 'no-NO' , // 挪威语（挪威）
	'fi_FI' : 'fi-FI' , // 芬兰语（芬兰）
	'cs_CZ' : 'cs-CZ' , // 捷克语（捷克）
	'sk_SK' : 'sk-SK' , // 斯洛伐克语（斯洛伐克）
	'ro_RO' : 'ro-RO' , // 罗马尼亚语（罗马尼亚）
	'hu_HU' : 'hu-HU' , // 匈牙利语（匈牙利）
	'el_GR' : 'el-GR' , // 希腊语（希腊）
	'he_IL' : 'he-IL' , // 希伯来语（以色列）
	'th_TH' : 'th-TH' , // 泰语（泰国）
	'id_ID' : 'id-ID' , // 印度尼西亚语（印度尼西亚）
	'ms_MY' : 'ms-MY' , // 马来语（马来西亚）
	'vi_VN' : 'vi-VN' , // 越南语（越南）
	'tl_PH' : 'tl-PH' , // 菲律宾语（菲律宾）
	'bn_IN' : 'bn-IN' , // 孟加拉语（印度）
	'pa_IN' : 'pa-IN' , // 旁遮普语（印度）
	'kn_IN' : 'kn-IN' , // 卡纳达语（印度）
	'ml_IN' : 'ml-IN' , // 马拉雅拉姆语（印度）
	'te_IN' : 'te-IN' , // 泰卢固语（印度）
	'mr_IN' : 'mr-IN' , // 马拉地语（印度）
	'gu_IN' : 'gu-IN' , // 古吉拉特语（印度）
	'ta_IN' : 'ta-IN' , // 泰米尔语（印度）
	'ne_NP' : 'ne-NP' , // 尼泊尔语（尼泊尔）
	'si_LK' : 'si-LK' , // 斯里兰卡僧伽罗语（斯里兰卡）
	'km_KH' : 'km-KH' , // 高棉语（柬埔寨）
	'lo_LA' : 'lo-LA' , // 老挝语（老挝）
	'my_MM' : 'my-MM' , // 缅甸语（缅甸）
	'bo_CN' : 'bo-CN' , // 藏语（中国）
	'hr_HR' : 'hr-HR' , // 克罗地亚语（克罗地亚）
	'sr_RS' : 'sr-RS' , // 塞尔维亚语（塞尔维亚）
	'bs_BA' : 'bs-BA' , // 波斯尼亚语（波斯尼亚和黑塞哥维那）
	'mk_MK' : 'mk-MK' , // 马其顿语（马其顿）
	'sq_AL' : 'sq-AL' , // 阿尔巴尼亚语（阿尔巴尼亚）
	'is_IS' : 'is-IS' , // 冰岛语（冰岛）
	'lv_LV' : 'lv-LV' , // 拉脱维亚语（拉脱维亚）
	'et_EE' : 'et-EE' , // 爱沙尼亚语（爱沙尼亚）
	'lt_LT' : 'lt-LT' , // 立陶宛语（立陶宛）
	'bs_CY' : 'bs-CY' , // 塞浦路斯语（塞浦路斯）
} as const;

export const languages = {
	"en_US": {
		code: "en-US",
		locale: "en-us",
		legacyCode: "en_US",
		englishName: "English (United States)",
		genericName: "English",
		nativeName: "English (US)"
	},
	"en_GB": {
		code: "en-GB",
		locale: "en-gb",
		legacyCode: "en_GB",
		englishName: "English (United Kingdom)",
		genericName: "English",
		nativeName: "English (UK)"
	},
	"zh_CN": {
		code: "zh-CN",
		locale: "zh-cn",
		legacyCode: "zh_CN",
		englishName: "Simplified Chinese",
		genericName: "Chinese",
		nativeName: "简体中文"
	},
	"zh_TW": {
		code: "zh-TW",
		locale: "zh-tw",
		legacyCode: "zh_TW",
		englishName: "Traditional Chinese (Taiwan)",
		genericName: "Chinese",
		nativeName: "繁體中文（台灣）"
	},
	"zh_HK": {
		code: "zh-HK",
		locale: "zh-hk",
		legacyCode: "zh_HK",
		englishName: "Traditional Chinese (Hong Kong)",
		genericName: "Chinese",
		nativeName: "繁體中文（香港）"
	},
	"es_ES": {
		code: "es-ES",
		locale: "es-es",
		legacyCode: "es_ES",
		englishName: "Spanish (Spain)",
		genericName: "Spanish",
		nativeName: "Español (España)"
	},
	"es_MX": {
		code: "es-MX",
		locale: "es-mx",
		legacyCode: "es_MX",
		englishName: "Spanish (Mexico)",
		genericName: "Spanish",
		nativeName: "Español (México)"
	},
	"fr_FR": {
		code: "fr-FR",
		locale: "fr-fr",
		legacyCode: "fr_FR",
		englishName: "French (France)",
		genericName: "French",
		nativeName: "Français"
	},
	"de_DE": {
		code: "de-DE",
		locale: "de-de",
		legacyCode: "de_DE",
		englishName: "German (Germany)",
		genericName: "German",
		nativeName: "Deutsch"
	},
	"it_IT": {
		code: "it-IT",
		locale: "it-it",
		legacyCode: "it_IT",
		englishName: "Italian (Italy)",
		genericName: "Italian",
		nativeName: "Italiano"
	},
	"pt_PT": {
		code: "pt-PT",
		locale: "pt-pt",
		legacyCode: "pt_PT",
		englishName: "Portuguese (Portugal)",
		genericName: "Portuguese",
		nativeName: "Português (Portugal)"
	},
	"pt_BR": {
		code: "pt-BR",
		locale: "pt-br",
		legacyCode: "pt_BR",
		englishName: "Portuguese (Brazil)",
		genericName: "Portuguese",
		nativeName: "Português (Brasil)"
	},
	"ja_JP": {
		code: "ja-JP",
		locale: "ja-jp",
		legacyCode: "ja_JP",
		englishName: "Japanese",
		genericName: "Japanese",
		nativeName: "日本語"
	},
	"ko_KR": {
		code: "ko-KR",
		locale: "ko-kr",
		legacyCode: "ko_KR",
		englishName: "Korean",
		genericName: "Korean",
		nativeName: "한국어"
	},
	"ru_RU": {
		code: "ru-RU",
		locale: "ru-ru",
		legacyCode: "ru_RU",
		englishName: "Russian",
		genericName: "Russian",
		nativeName: "Русский"
	},
	"ar_SA": {
		code: "ar-SA",
		locale: "ar-sa",
		legacyCode: "ar_SA",
		englishName: "Arabic (Saudi Arabia)",
		genericName: "Arabic",
		nativeName: "العربية"
	},
	"tr_TR": {
		code: "tr-TR",
		locale: "tr-tr",
		legacyCode: "tr_TR",
		englishName: "Turkish",
		genericName: "Turkish",
		nativeName: "Türkçe"
	},
	"hi_IN": {
		code: "hi-IN",
		locale: "hi-in",
		legacyCode: "hi_IN",
		englishName: "Hindi (India)",
		genericName: "Hindi",
		nativeName: "हिन्दी"
	},
	"nl_NL": {
		code: "nl-NL",
		locale: "nl-nl",
		legacyCode: "nl_NL",
		englishName: "Dutch (Netherlands)",
		genericName: "Dutch",
		nativeName: "Nederlands"
	},
	"sv_SE": {
		code: "sv-SE",
		locale: "sv-se",
		legacyCode: "sv_SE",
		englishName: "Swedish",
		genericName: "Swedish",
		nativeName: "Svenska"
	},
	"pl_PL": {
		code: "pl-PL",
		locale: "pl-pl",
		legacyCode: "pl_PL",
		englishName: "Polish",
		genericName: "Polish",
		nativeName: "Polski"
	},
	"da_DK": {
		code: "da-DK",
		locale: "da-dk",
		legacyCode: "da_DK",
		englishName: "Danish",
		genericName: "Danish",
		nativeName: "Dansk"
	},
	"nb_NO": {
		code: "nb-NO",
		locale: "nb-no",
		legacyCode: "nb_NO",
		englishName: "Norwegian Bokmål",
		genericName: "Norwegian",
		nativeName: "Norsk bokmål"
	},
	"fi_FI": {
		code: "fi-FI",
		locale: "fi-fi",
		legacyCode: "fi_FI",
		englishName: "Finnish",
		genericName: "Finnish",
		nativeName: "Suomi"
	},
	"cs_CZ": {
		code: "cs-CZ",
		locale: "cs-cz",
		legacyCode: "cs_CZ",
		englishName: "Czech",
		genericName: "Czech",
		nativeName: "Čeština"
	},
	"sk_SK": {
		code: "sk-SK",
		locale: "sk-sk",
		legacyCode: "sk_SK",
		englishName: "Slovak",
		genericName: "Slovak",
		nativeName: "Slovenčina"
	},
	"ro_RO": {
		code: "ro-RO",
		locale: "ro-ro",
		legacyCode: "ro_RO",
		englishName: "Romanian",
		genericName: "Romanian",
		nativeName: "Română"
	},
	"hu_HU": {
		code: "hu-HU",
		locale: "hu-hu",
		legacyCode: "hu_HU",
		englishName: "Hungarian",
		genericName: "Hungarian",
		nativeName: "Magyar"
	},
	"el_GR": {
		code: "el-GR",
		locale: "el-gr",
		legacyCode: "el_GR",
		englishName: "Greek",
		genericName: "Greek",
		nativeName: "Ελληνικά"
	},
	"he_IL": {
		code: "he-IL",
		locale: "he-il",
		legacyCode: "he_IL",
		englishName: "Hebrew",
		genericName: "Hebrew",
		nativeName: "עברית"
	},
	"th_TH": {
		code: "th-TH",
		locale: "th-th",
		legacyCode: "th_TH",
		englishName: "Thai",
		genericName: "Thai",
		nativeName: "ไทย"
	},
	"id_ID": {
		code: "id-ID",
		locale: "id-id",
		legacyCode: "id_ID",
		englishName: "Indonesian",
		genericName: "Indonesian",
		nativeName: "Bahasa Indonesia"
	},
	"ms_MY": {
		code: "ms-MY",
		locale: "ms-my",
		legacyCode: "ms_MY",
		englishName: "Malay",
		genericName: "Malay",
		nativeName: "Bahasa Melayu"
	},
	"vi_VN": {
		code: "vi-VN",
		locale: "vi-vn",
		legacyCode: "vi_VN",
		englishName: "Vietnamese",
		genericName: "Vietnamese",
		nativeName: "Tiếng Việt"
	},
	"fil_PH": {
		code: "fil-PH",
		locale: "fil-ph",
		legacyCode: "fil_PH",
		englishName: "Filipino",
		genericName: "Filipino",
		nativeName: "Wikang Filipino"
	},
	"bn_IN": {
		code: "bn-IN",
		locale: "bn-in",
		legacyCode: "bn_IN",
		englishName: "Bengali (India)",
		genericName: "Bengali",
		nativeName: "বাংলা"
	},
	"pa_IN": {
		code: "pa-IN",
		locale: "pa-in",
		legacyCode: "pa_IN",
		englishName: "Punjabi",
		genericName: "Punjabi",
		nativeName: "ਪੰਜਾਬੀ"
	},
	"kn_IN": {
		code: "kn-IN",
		locale: "kn-in",
		legacyCode: "kn_IN",
		englishName: "Kannada",
		genericName: "Kannada",
		nativeName: "ಕನ್ನಡ"
	},
	"ml_IN": {
		code: "ml-IN",
		locale: "ml-in",
		legacyCode: "ml_IN",
		englishName: "Malayalam",
		genericName: "Malayalam",
		nativeName: "മലയാളം"
	},
	"te_IN": {
		code: "te-IN",
		locale: "te-in",
		legacyCode: "te_IN",
		englishName: "Telugu",
		genericName: "Telugu",
		nativeName: "తెలుగు"
	},
	"mr_IN": {
		code: "mr-IN",
		locale: "mr-in",
		legacyCode: "mr_IN",
		englishName: "Marathi",
		genericName: "Marathi",
		nativeName: "मराठी"
	},
	"gu_IN": {
		code: "gu-IN",
		locale: "gu-in",
		legacyCode: "gu_IN",
		englishName: "Gujarati",
		genericName: "Gujarati",
		nativeName: "ગુજરાતી"
	},
	"ta_IN": {
		code: "ta-IN",
		locale: "ta-in",
		legacyCode: "ta_IN",
		englishName: "Tamil",
		genericName: "Tamil",
		nativeName: "தமிழ்"
	},
	"ne_NP": {
		code: "ne-NP",
		locale: "ne-np",
		legacyCode: "ne_NP",
		englishName: "Nepali",
		genericName: "Nepali",
		nativeName: "नेपाली"
	},
	"si_LK": {
		code: "si-LK",
		locale: "si-lk",
		legacyCode: "si_LK",
		englishName: "Sinhala",
		genericName: "Sinhala",
		nativeName: "සිංහල"
	},
	"km_KH": {
		code: "km-KH",
		locale: "km-kh",
		legacyCode: "km_KH",
		englishName: "Khmer",
		genericName: "Khmer",
		nativeName: "ភាសាខ្មែរ"
	},
	"lo_LA": {
		code: "lo-LA",
		locale: "lo-la",
		legacyCode: "lo_LA",
		englishName: "Lao",
		genericName: "Lao",
		nativeName: "ລາວ"
	},
	"my_MM": {
		code: "my-MM",
		locale: "my-mm",
		legacyCode: "my_MM",
		englishName: "Burmese",
		genericName: "Burmese",
		nativeName: "မြန်မာဘာသာ"
	},
	"bo_CN": {
		code: "bo-CN",
		locale: "bo-cn",
		legacyCode: "bo_CN",
		englishName: "Tibetan",
		genericName: "Tibetan",
		nativeName: "བོད་ཡིག"
	},
	"hr_HR": {
		code: "hr-HR",
		locale: "hr-hr",
		legacyCode: "hr_HR",
		englishName: "Croatian",
		genericName: "Croatian",
		nativeName: "Hrvatski"
	},
	"sr_RS": {
		code: "sr-RS",
		locale: "sr-rs",
		legacyCode: "sr_RS",
		englishName: "Serbian",
		genericName: "Serbian",
		nativeName: "Српски"
	},
	"bs_BA": {
		code: "bs-BA",
		locale: "bs-ba",
		legacyCode: "bs_BA",
		englishName: "Bosnian",
		genericName: "Bosnian",
		nativeName: "Bosanski"
	},
	"mk_MK": {
		code: "mk-MK",
		locale: "mk-mk",
		legacyCode: "mk_MK",
		englishName: "Macedonian",
		genericName: "Macedonian",
		nativeName: "Македонски"
	},
	"sq_AL": {
		code: "sq-AL",
		locale: "sq-al",
		legacyCode: "sq_AL",
		englishName: "Albanian",
		genericName: "Albanian",
		nativeName: "Shqip"
	},
	"is_IS": {
		code: "is-IS",
		locale: "is-is",
		legacyCode: "is_IS",
		englishName: "Icelandic",
		genericName: "Icelandic",
		nativeName: "Íslenska"
	},
	"lv_LV": {
		code: "lv-LV",
		locale: "lv-lv",
		legacyCode: "lv_LV",
		englishName: "Latvian",
		genericName: "Latvian",
		nativeName: "Latviešu"
	},
	"et_EE": {
		code: "et-EE",
		locale: "et-ee",
		legacyCode: "et_EE",
		englishName: "Estonian",
		genericName: "Estonian",
		nativeName: "Eesti"
	},
	"lt_LT": {
		code: "lt-LT",
		locale: "lt-lt",
		legacyCode: "lt_LT",
		englishName: "Lithuanian",
		genericName: "Lithuanian",
		nativeName: "Lietuvių"
	},
	"el_CY": {
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

