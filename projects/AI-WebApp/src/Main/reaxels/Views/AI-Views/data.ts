import { WebContentsView } from "electron";

export const AIKeys:AI[] = [
	"chatgpt",
	"grok",
	"gemini",
	"deepseek",
];
export const AIData = [
	{
		label : "ChatGPT" as const,
		AIName : 'chatgpt' as const,
		domain : "https://chatgpt.com",
		browser_name : "chatgpt_window" as const,	
	},
	{
		label : "Grok" as const,
		AIName : 'grok'  as const,
		domain : "https://grok.com",
		browser_name : "grok_window" as const,
	},
	{
		label : "Gemini" as const,
		AIName : 'gemini' as const,
		domain : "https://gemini.google.com",
		browser_name : "gemini_window" as const,
	},
	{
		label : "DeepSeek" as const,
		AIName : 'deepseek' as const,
		domain : "https://chat.deepseek.com",
		browser_name : "deepseek_window" as const,
	},
]
export type AI = "chatgpt"|"grok"|"gemini"|"deepseek";
export type AIView = {
	AIName : AI ,
	view : WebContentsView,
	label: string,
	domain : string,
}
