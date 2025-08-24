/**
 * Chat表示用户的某轮连续对话
 */
export type Chat = {
	chat_id : string;
	fk_channel_id : Channel['channel_id'];
	chat_title : string;
	is_free_chat : boolean;
	/*取消对话上下文关联*/
	disable_turn_context: boolean;
	children : string[];
	created_at? : number;
	current_node? : string;
	is_do_not_remember? : string;
}


import type { Channel } from './Channel';
import type { Message } from './Message';
