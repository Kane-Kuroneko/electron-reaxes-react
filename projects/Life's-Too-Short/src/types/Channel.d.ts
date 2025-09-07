/**
 * Channel是某个'主题',包含了所有与其相关的Chats
 */
export type Channel = {
	channel_id : string;
	channel_title:string;
	created_at: number;
	archived?: boolean;
	
	channel_prompts : {
		//包含该channel应该[专注于什么工作],[以什么风格输出],[更注重情感还是事实]等
		system: (TextPrompt)[];
		//system:以何种格式输出内容
		outputTemplate? : string;
		//channel需要知道的[基础信息][去哪里找资料]
		custom?: (TextPrompt)[];
	}
}



import type {TextPrompt} from './Prompt';




