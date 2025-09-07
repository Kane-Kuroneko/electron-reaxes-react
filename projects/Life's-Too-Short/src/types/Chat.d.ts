/**
 * Chat表示用户的某轮连续对话
 */
export type Chat = {
	chat_id : string;
	fk_channel_id : Channel['channel_id'];
	chat_title? : string;
	is_free_chat : boolean;
	/*取消对话上下文关联*/
	disable_turn_context: boolean;
	children : string[];
	created_at? : number;
	current_node? : string;
	is_do_not_remember? : string;
	
	chat_prompt : {
		//用户在chat中添加的提示词,仅本chat生效
		custom? : null | {
			enabled : boolean;
			content : string;
		};
		//快捷添加预设提示词块
		addons? : (PresetPrompt&{
			//chat中可以单独开关每个已添加的addon
			enabled : boolean;
			
		})[];
		enable_channel_prompt? : boolean;
	}
}


export namespace Chat{
	export type DraftChat = Omit<Chat , "chat_id"> & {
		client_chat_id : string;
	}
	export type MatchedChat = Chat & {
		client_chat_id : string;
	}
}

import type { Prompt , PresetPrompt } from './Prompt';
import type { Channel } from './Channel';
import type { Message } from './Message';
