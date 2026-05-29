/**
 * Main Process I18n Reaxel
 * 主进程国际化模块，通过 IPC 与渲染进程同步语言设置
 * 
 * 单一数据源: user-settings.json → appearance.language
 * 启动时从持久化配置读取语言，运行时通过 IPC 接收渲染进程的语言变更
 */
export const reaxel_I18n = reaxel(() => {
	// 从持久化配置读取初始语言
	const persistedLanguage = getSettingsConfigService().getEffectiveSettings().appearance.language || 'en-US';
	console.log('[I18n] Init: persisted language from settings =', persistedLanguage);
	
	const { store, setState, mutate } = createReaxable({
		language: persistedLanguage as Languages,
		languageMaps: {} as { [p: string]: string },
	});
	
	const sourceLanguage = 'en-US';
	
	// 预加载所有语言资源
	const languageResources: { [key: string]: { [key: string]: string } } = {
		'zh-CN': zhCN,
		'zh-TW': zhTW,
		'ja-JP': jaJP,
		'ko-KR': koKR,
	};
	
	// 加载语言资源
	const loadLanguage = (lang: Languages) => {
		if (lang === sourceLanguage) {
			setState({ language: lang, languageMaps: {} });
			return;
		}
		
		const resourceMap = languageResources[lang];
		if (resourceMap) {
			setState({ language: lang, languageMaps: resourceMap });
		} else {
			console.error(`[I18n] Language ${lang} not found, falling back to ${sourceLanguage}`);
			setState({ language: sourceLanguage as Languages, languageMaps: {} });
		}
	};
	
	// 初始化时加载持久化语言的资源
	if (persistedLanguage !== sourceLanguage) {
		loadLanguage(persistedLanguage as Languages);
	}
	
	// 设置语言
	const setLanguage = (lang: Languages) => {
		console.log('[I18n] setLanguage called:', lang);
		loadLanguage(lang);
	};
	
	// i18n 翻译函数
	const i18n = (langText: string): string => {
		const lang = store.language;
		if (lang === sourceLanguage) {
			return langText;
		}
		
		if (store.languageMaps && store.languageMaps[langText]) {
			return store.languageMaps[langText];
		}
		
		console.warn(`[I18n] Missing translation for lang=${lang}: "${langText}"`);
		return langText;
	};
	
	const rtn = {
		setLanguage,
		i18n,
		get language() { return store.language; },
		get languageMaps() { return store.languageMaps; },
	};
	
	return Object.assign(() => rtn, {
		store,
		setState,
		mutate,
	});
});

import zhCN from '#src/Views/SettingsView/reaxels/i18n/langs/zh-CN';
import zhTW from '#src/Views/SettingsView/reaxels/i18n/langs/zh-TW';
import jaJP from '#src/Views/SettingsView/reaxels/i18n/langs/ja-JP';
import koKR from '#src/Views/SettingsView/reaxels/i18n/langs/ko-KR';
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import { createReaxable, reaxel } from 'reaxes';
import type { Languages } from '#src/Types/Languages';
