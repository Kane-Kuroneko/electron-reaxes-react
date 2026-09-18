/**
 * @description 供应商 logo 的纯数据工具（主进程 / 渲染端共用，不含 React）。
 * 见 docs/features/ai-vendor-logo-identity.md
 */

/** 有打包 SVG logo 的 family（与 scripts/sync-ai-vendor-logos.ts 的映射一致）。 */
export const AI_FAMILIES_WITH_BUNDLED_LOGO:ReadonlySet<string> = new Set( [
	'chatgpt' ,
	'grok' ,
	'gemini' ,
	'deepseek' ,
	'perplexity' ,
	'claude' ,
	'manus' ,
	'aistudio' ,
	'copilot' ,
	'meta-ai' ,
	'poe' ,
	'mistral' ,
	'doubao' ,
	'qianwen' ,
	'kimi' ,
	'chatglm' ,
	'yuanbao' ,
	'hailuo' ,
	'yiyan',
] );

export const hasBundledVendorLogo = ( family:string ) => AI_FAMILIES_WITH_BUNDLED_LOGO.has( family );

/**
 * 把一页实例压成跨 IPC 的 VendorRef。
 * 内置 family 只带 family；custom 等无品牌 logo 的才带 faviconUrl / url（首字母兜底取字）。
 */
export const toVendorRef = (
	ai:Pick<AI.AIItem , 'AI_family' | 'url' | 'url_override'> ,
	faviconUrl?:string | null,
):AI.VendorRef => {
	if( hasBundledVendorLogo( ai.AI_family ) ) {
		return { family : ai.AI_family };
	}
	return {
		family : ai.AI_family ,
		faviconUrl : faviconUrl ?? null ,
		url : ai.url_override || ai.url || undefined,
	};
};

/** 首字母兜底的取字：优先站点域名，其次 label / family。 */
export const vendorFallbackText = ( vendor:Pick<AI.VendorRef , 'url' | 'family'> , label?:string ) => {
	if( vendor.url ) {
		try {
			return new URL( vendor.url ).hostname;
		} catch {
			return vendor.url;
		}
	}
	return label || vendor.family;
};

import type { AI } from '#src/Types/SettingsTypes/AI';
