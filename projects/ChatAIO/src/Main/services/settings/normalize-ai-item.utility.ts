/**
 * 用已加载的供应商目录行补全页实例（空 url、未知 family）。
 * 只知道 family 时查 vendors.find(family === family)；custom 默认 url 为 ''。
 * 目录行不是 AIItem；本函数吃的是实例，查的是供应商。
 * 见 docs/feature-proposal--ai-catalog-source.md（方向纠偏）。
 */

export const normalizeAIItem = ( ai:AI.AIItem , catalogVendors:AICatalog.Vendor[] ):AI.AIItem => {
	const family = normalizeAIFamily( ai , catalogVendors );
	const defaultUrl = familyDefaultUrl( family , catalogVendors );
	return {
		...ai ,
		label : ai.label || ( family === 'custom' ? 'Custom AI' : family ) ,
		AI_family : family ,
		url : ai.url || defaultUrl ,
		disabled : ai.disabled === true ,
		url_override : family === 'custom' ? null : ai.url_override || null ,
		proxy_mode : ai.proxy_mode || 'follow_global_setting' ,
		from_server_list_proxy : ai.from_server_list_proxy || null ,
		user_fill_proxy : ai.user_fill_proxy || null ,
		preloadOnStartup : ai.preloadOnStartup === true,
	};
};

const familyDefaultUrl = ( family:AI.AIFamily , catalogVendors:AICatalog.Vendor[] ):string => {
	if( family === 'custom' ) {
		return '';
	}
	const row = catalogVendors.find( vendor => vendor.family === family );
	return row?.url || '';
};

const normalizeAIFamily = ( ai:AI.AIItem , catalogVendors:AICatalog.Vendor[] ):AI.AIFamily => {
	const family = ai.AI_family;
	if( !family || family === 'custom' ) {
		return 'custom';
	}
	const row = catalogVendors.find( vendor => vendor.family === family );
	if( !row ) {
		return 'custom';
	}
	const defaultUrl = row.url || '';
	if( ai.id?.startsWith( 'custom-' ) && ai.url && ai.url !== defaultUrl ) {
		return 'custom';
	}
	return family;
};

import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
