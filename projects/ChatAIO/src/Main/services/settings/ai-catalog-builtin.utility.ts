/**
 * App 内置的供应商→实例策略。目录 JSON 不存这些。
 * 默认禁用表 = 纠偏前 JSON 里 disabled:true 的那些 family，迁到这里以免丢产品行为。
 * dev-proxy-test 不进生产目录，只在 isDev 时追加。
 * 见 docs/feature-proposal--ai-catalog-source.md（方向纠偏）。
 */

export type BuiltinAIItemDefaults = {
	disabledFamilies : ReadonlySet<AI.AIFamily>;
};

/** 第一启动映射种子页时：这些 family 默认关闭。用户点过启用后写在 user-ais，不再跟这张表。 */
export const FAMILY_DISABLED_BY_DEFAULT : ReadonlySet<AI.AIFamily> = new Set( [
	'manus' ,
	'aistudio' ,
	'copilot' ,
	'meta-ai' ,
	'poe' ,
	'mistral' ,
	'chatglm' ,
	'yuanbao' ,
	'hailuo' ,
	'yiyan' ,
] );

export const DEFAULT_BUILTIN_AI_ITEM : BuiltinAIItemDefaults = {
	disabledFamilies : FAMILY_DISABLED_BY_DEFAULT,
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
 * 内置：proxy follow_global、preload false、url_override null、disabled 看默认禁用表。
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
import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
