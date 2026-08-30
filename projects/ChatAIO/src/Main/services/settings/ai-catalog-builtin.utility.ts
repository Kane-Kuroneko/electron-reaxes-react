/**
 * App 内置的供应商→实例映射与 dev 注入。只含策略函数，不含名单定义。
 * 默认关闭哪些 family：读 src/shared/statics/ai-family-disabled-by-default.ts。
 * 目录 JSON 不存 disabled / proxy / preload。dev-proxy-test 不进生产目录，只在 isDev 时追加。
 * 见 docs/architecture/ai-config.md、docs/feature-proposal--ai-catalog-source.md。
 */

/** 映射时注入的 App 策略。名单本身不在这个文件里。 */
export type BuiltinAIItemDefaults = {
	disabledFamilies : ReadonlySet<AI.AIFamily>;
};

/** 读纯数据名单，给 vendorToAIItem 当默认策略。 */
export const DEFAULT_BUILTIN_AI_ITEM : BuiltinAIItemDefaults = {
	disabledFamilies : new Set<AI.AIFamily>( FAMILY_DISABLED_BY_DEFAULT ),
};

/** 开发用代理探测页。稳定 UUID，同一 family 永远同一 id。禁止写进 default-ais.json。 */
export const DEV_PROXY_TEST_VENDOR : AICatalog.Vendor = {
	id : 'f39b0b7e-f419-4a8d-bf92-82ebbe22a7cf' ,
	family : 'dev-proxy-test' ,
	label : 'ChatAIO (Proxy Test)' ,
	url : 'https://whatismyipaddress.com/' ,
	region : { ...EMPTY_VENDOR_REGION },
};

/**
 * 供应商行 → 运行时页实例。官方种子页 id = 供应商 UUID。
 * 内置：proxy follow_global、preload false、url_override null、disabled 读 FAMILY_DISABLED_BY_DEFAULT。
 */
export const vendorToAIItem = (
	vendor:AICatalog.Vendor ,
	builtinDefaults:BuiltinAIItemDefaults = DEFAULT_BUILTIN_AI_ITEM,
):AI.AIItem => {
	return {
		id : vendor.id ,
		label : vendor.label ,
		AI_family : vendor.family ,
		url : vendor.url ,
		disabled : builtinDefaults.disabledFamilies.has( vendor.family ) ,
		url_override : null ,
		proxy_mode : 'follow_global_setting' ,
		from_server_list_proxy : null ,
		user_fill_proxy : null ,
		preloadOnStartup : false,
	};
};

/** 命令式追加。isDev 由调用方传入（App 里用 dev()），不在本文件读环境、不用 obsReaction。 */
export const appendDevProxyTestVendor = (
	catalog:AICatalog.Catalog ,
	isDev:boolean,
):AICatalog.Catalog => {
	if( !isDev ) {
		return catalog;
	}
	if( catalog.ais.some( vendor => vendor.family === 'dev-proxy-test' ) ) {
		return catalog;
	}
	return {
		...catalog ,
		ais : [
			...catalog.ais ,
			DEV_PROXY_TEST_VENDOR ,
		],
	};
};

import { EMPTY_VENDOR_REGION } from './ai-catalog-region.utility';
import { FAMILY_DISABLED_BY_DEFAULT } from '#shared/statics/ai-family-disabled-by-default';
import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
