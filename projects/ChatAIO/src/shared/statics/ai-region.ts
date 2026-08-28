/**
 * AI 区域分类工具（GuidingView 国内/国际产品分组）。
 * 按 AI_family 判断服务商归属，不是供应商 JSON 的 ISO 覆盖（catalog.region）。
 * 国内/国际产品身份不能从「哪些国家可用」派生，两套表职责不同，不要合并。
 * ISO 可用/禁用见 ai-catalog-region.utility.ts 与 default-ais.json 的 region 字段。
 */

export type AIRegion = 'domestic' | 'international';

/** 国内 AI 服务商 family 集合 */
const DOMESTIC_AI_FAMILIES:ReadonlySet<AI.AIFamily> = new Set( [
	'deepseek' ,
	'doubao' ,
	'qianwen' ,
	'kimi' ,
	'chatglm' ,
	'yuanbao' ,
	'hailuo' ,
	'yiyan' ,
] );

export const getAIRegion = (family:AI.AIFamily):AIRegion => {
	return DOMESTIC_AI_FAMILIES.has( family ) ? 'domestic' : 'international';
};

export const isDomesticAI = (family:AI.AIFamily):boolean => {
	return DOMESTIC_AI_FAMILIES.has( family );
};

/**
 * 将 AI 列表按区域分组
 * @returns { domestic: AIItem[], international: AIItem[] }
 */
export const groupAIsByRegion = <T extends { AI_family: AI.AIFamily }>( ais:T[] ) => {
	const domestic:T[] = [];
	const international:T[] = [];
	for( const ai of ais ) {
		if( isDomesticAI( ai.AI_family ) ) {
			domestic.push( ai );
		} else {
			international.push( ai );
		}
	}
	return { domestic , international } as const;
};

export const AIRegionLabel:Record<AIRegion , string> = {
	domestic : 'Domestic AI Providers' ,
	international : 'International AI Providers',
};

import type { AI } from '#src/Types/SettingsTypes/AI';
