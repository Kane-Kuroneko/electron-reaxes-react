// AI Family keys (types) - these are the supported AI families
export const AIKeys: AI.AIFamily[] = [ ...AIFamily ];

// Legacy AIData - kept for backward compatibility with view initialization
// The actual AI configurations are now managed by AIConfigService
export const AIData = [
	{
		label : "ChatGPT" as const,
		AIName : checkAs<AI.AIFamily>('chatgpt'),
		domain : getAIDomainByFamily( 'chatgpt' ),
		browser_name : "chatgpt_window" as const,
	},
	{
		label : "Grok" as const,
		AIName : checkAs<AI.AIFamily>('grok'),
		domain : getAIDomainByFamily( 'grok' ),
		browser_name : "grok_window" as const,
	},
	{
		label : "Gemini" as const,
		AIName : checkAs<AI.AIFamily>('gemini'),
		domain : getAIDomainByFamily( 'gemini' ),
		browser_name : "gemini_window" as const,
	},
	{
		label : "DeepSeek" as const,
		AIName : checkAs<AI.AIFamily>('deepseek'),
		domain : getAIDomainByFamily( 'deepseek' ),
		browser_name : "deepseek_window" as const,
	},
	{
		label : "Perplexity" as const,
		AIName : checkAs<AI.AIFamily>('perplexity'),
		domain : getAIDomainByFamily( 'perplexity' ),
		browser_name : "perplexity_window" as const,
	},
	{
		label : "Claude" as const,
		AIName : checkAs<AI.AIFamily>('claude'),
		domain : getAIDomainByFamily( 'claude' ),
		browser_name : "claude_window" as const,
	},
	{
		label : "Manus" as const,
		AIName : checkAs<AI.AIFamily>('manus'),
		domain : getAIDomainByFamily( 'manus' ),
		browser_name : "manus_window" as const,
	},
	{
		label : "Google AI Studio" as const,
		AIName : checkAs<AI.AIFamily>('aistudio'),
		domain : getAIDomainByFamily( 'aistudio' ),
		browser_name : "aistudio_window" as const,
	},
	{
		label : "Copilot" as const,
		AIName : checkAs<AI.AIFamily>('copilot'),
		domain : getAIDomainByFamily( 'copilot' ),
		browser_name : "copilot_window" as const,
	},
	{
		label : "Meta AI" as const,
		AIName : checkAs<AI.AIFamily>('meta-ai'),
		domain : getAIDomainByFamily( 'meta-ai' ),
		browser_name : "meta_ai_window" as const,
	},
	{
		label : "Poe" as const,
		AIName : checkAs<AI.AIFamily>('poe'),
		domain : getAIDomainByFamily( 'poe' ),
		browser_name : "poe_window" as const,
	},
	{
		label : "Mistral" as const,
		AIName : checkAs<AI.AIFamily>('mistral'),
		domain : getAIDomainByFamily( 'mistral' ),
		browser_name : "mistral_window" as const,
	},
	{
		label : "豆包" as const,
		AIName : checkAs<AI.AIFamily>('doubao'),
		domain : getAIDomainByFamily( 'doubao' ),
		browser_name : "doubao_window" as const,
	},
	{
		label : "通义千问" as const,
		AIName : checkAs<AI.AIFamily>('qianwen'),
		domain : getAIDomainByFamily( 'qianwen' ),
		browser_name : "qianwen_window" as const,
	},
	{
		label : "Kimi" as const,
		AIName : checkAs<AI.AIFamily>('kimi'),
		domain : getAIDomainByFamily( 'kimi' ),
		browser_name : "kimi_window" as const,
	},
	{
		label : "智谱清言" as const,
		AIName : checkAs<AI.AIFamily>('chatglm'),
		domain : getAIDomainByFamily( 'chatglm' ),
		browser_name : "chatglm_window" as const,
	},
	{
		label : "腾讯元宝" as const,
		AIName : checkAs<AI.AIFamily>('yuanbao'),
		domain : getAIDomainByFamily( 'yuanbao' ),
		browser_name : "yuanbao_window" as const,
	},
	{
		label : "海螺" as const,
		AIName : checkAs<AI.AIFamily>('hailuo'),
		domain : getAIDomainByFamily( 'hailuo' ),
		browser_name : "hailuo_window" as const,
	},
	{
		label : "文心一言" as const,
		AIName : checkAs<AI.AIFamily>('yiyan'),
		domain : getAIDomainByFamily( 'yiyan' ),
		browser_name : "yiyan_window" as const,
	},
	{
		label : "Custom AI" as const,
		AIName : checkAs<AI.AIFamily>('custom'),
		domain : getAIDomainByFamily( 'custom' ),
		browser_name : "custom_window" as const,
	},
	{
		label : "ChatAIO (Proxy Test)" as const,
		AIName : checkAs<AI.AIFamily>('dev-proxy-test'),
		domain : getAIDomainByFamily( 'dev-proxy-test' ),
		browser_name : "ai_web_window" as const,
	},
]

export type AIView = {
	AIName : AI.AIFamily ,
	view : WebContentsView,
	label: string,
	domain : string,
}

export { getAIDomainByFamily } from '#src/shared/statics/ai-family-defaults';

/**
 * Get browser name by AI family
 */
export function getBrowserNameByFamily(family: AI.AIFamily): string {
	const aiData = AIData.find(item => item.AIName === family);
	return aiData?.browser_name || `${family}_window`;
}

import { WebContentsView } from "electron";
import { AIFamily } from '#src/shared/statics/AI-family';
import { getAIDomainByFamily } from '#src/shared/statics/ai-family-defaults';
import { AI } from "#src/Types/SettingsTypes/AI";
