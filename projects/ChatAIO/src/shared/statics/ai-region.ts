/**
 * AI 区域分类工具
 * 根据 AI_family 判断服务商归属区域，供 GuidingView / SettingsView 等消费方进行分组展示。
 * 区域分类逻辑集中维护于此，不在各视图层散落判断。
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
