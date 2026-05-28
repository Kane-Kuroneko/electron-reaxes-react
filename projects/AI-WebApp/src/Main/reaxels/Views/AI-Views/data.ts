// AI Family keys (types) - these are the supported AI families
export const AIKeys: AI.AIFamily[] = [
	"chatgpt",
	"grok",
	"gemini",
	"deepseek",
	"perplexity",
	"dev-proxy-test",
];

// Legacy AIData - kept for backward compatibility with view initialization
// The actual AI configurations are now managed by AIConfigService
export const AIData = [
	{
		label : "ChatGPT" as const,
		AIName : checkAs<AI.AIFamily>('chatgpt'),
		domain : "https://chatgpt.com",
		browser_name : "chatgpt_window" as const,	
	},
	{
		label : "Grok" as const,
		AIName : checkAs<AI.AIFamily>('grok'),
		domain : "https://grok.com",
		browser_name : "grok_window" as const,
	},
	{
		label : "Gemini" as const,
		AIName : checkAs<AI.AIFamily>('gemini'),
		domain : "https://gemini.google.com",
		browser_name : "gemini_window" as const,
	},
	{
		label : "DeepSeek" as const,
		AIName : checkAs<AI.AIFamily>('deepseek'),
		domain : "https://chat.deepseek.com",
		browser_name : "deepseek_window" as const,
	},
	{
		label : "Perplexity" as const,
		AIName : checkAs<AI.AIFamily>('perplexity'),
		domain : "https://www.perplexity.ai",
		browser_name : "perplexity_window" as const,
	},
	{
		label : "AI-Web (Proxy Test)" as const,
		AIName : checkAs<AI.AIFamily>('dev-proxy-test'),
		domain : "https://whatismyipaddress.com/",
		browser_name : "ai_web_window" as const,
	},
]

export type AIView = {
	AIName : AI.AIFamily ,
	view : WebContentsView,
	label: string,
	domain : string,
}

import { WebContentsView } from "electron";
import { AI } from "#src/Types/SettingsTypes/AI";

/**
 * Get AI domain by family name
 * Used to map AI configurations to their default domains
 */
export function getAIDomainByFamily(family: AI.AIFamily): string {
	const aiData = AIData.find(item => item.AIName === family);
	return aiData?.domain || '';
}

/**
 * Get browser name by AI family
 */
export function getBrowserNameByFamily(family: AI.AIFamily): string {
	const aiData = AIData.find(item => item.AIName === family);
	return aiData?.browser_name || `${family}_window`;
}
