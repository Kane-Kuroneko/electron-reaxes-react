export const AIFamily:AI.AIFamily[] = [
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
	'yiyan' ,
	'custom' ,
	'dev-proxy-test' ,
];

/**
 * family → 供应商显示名（Settings 表 family 列、family 下拉）。
 * 重构后用户 label 不再含厂商名，厂商由 logo + 这里的显示名承担。见 docs/features/ai-vendor-logo-identity.md
 */
export const AIFamilyDisplayName:Record<AI.AIFamily , string> = {
	chatgpt : 'ChatGPT' ,
	grok : 'Grok' ,
	gemini : 'Gemini' ,
	deepseek : 'DeepSeek' ,
	perplexity : 'Perplexity' ,
	claude : 'Claude' ,
	manus : 'Manus' ,
	aistudio : 'AI Studio' ,
	copilot : 'Copilot' ,
	'meta-ai' : 'Meta AI' ,
	poe : 'Poe' ,
	mistral : 'Mistral' ,
	doubao : 'Doubao' ,
	qianwen : 'Qianwen' ,
	kimi : 'Kimi' ,
	chatglm : 'ChatGLM' ,
	yuanbao : 'Yuanbao' ,
	hailuo : 'Hailuo' ,
	yiyan : 'Yiyan' ,
	custom : 'Custom' ,
	'dev-proxy-test' : 'Proxy Test',
};

import { AI } from "#src/Types/SettingsTypes/AI";
