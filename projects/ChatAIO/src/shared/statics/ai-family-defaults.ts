/**
 * AI family 默认聊天 URL 单一事实源。
 * 一律使用聊天入口路径，禁止门户 / 营销落地页。
 */

export const AI_FAMILY_DEFAULT_URLS:Record<AI.AIFamily , string> = {
	chatgpt : 'https://chatgpt.com' ,
	grok : 'https://grok.com' ,
	gemini : 'https://gemini.google.com/app' ,
	deepseek : 'https://chat.deepseek.com' ,
	perplexity : 'https://www.perplexity.ai' ,
	claude : 'https://claude.ai' ,
	manus : 'https://manus.im/app' ,
	aistudio : 'https://aistudio.google.com/prompts/new_chat' ,
	copilot : 'https://copilot.microsoft.com' ,
	'meta-ai' : 'https://www.meta.ai' ,
	poe : 'https://poe.com' ,
	mistral : 'https://chat.mistral.ai/chat' ,
	doubao : 'https://www.doubao.com/chat' ,
	qianwen : 'https://tongyi.aliyun.com/qianwen' ,
	kimi : 'https://kimi.moonshot.cn' ,
	chatglm : 'https://chatglm.cn/main/alltoolsdetail' ,
	yuanbao : 'https://yuanbao.tencent.com/chat' ,
	hailuo : 'https://hailuoai.com' ,
	yiyan : 'https://yiyan.baidu.com' ,
	custom : '' ,
	'dev-proxy-test' : 'https://whatismyipaddress.com/' ,
};

export function getAIDomainByFamily( family:AI.AIFamily ):string {
	return AI_FAMILY_DEFAULT_URLS[family] ?? '';
}

import type { AI } from '#src/Types/SettingsTypes/AI';
