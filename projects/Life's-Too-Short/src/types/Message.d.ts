export type Message = {
	message_id: string;
	fk_chat_id: string;
	author: Author;
	content: string|string[];
	role: Message.Role;
	create_time?: number;
};
/**
 * Message代表的是某个独立的信息片段
 */
export namespace Message {
	export type Role = 'user' | 'assistant' | 'system';
	
	export type UserMessage = Message & {
		role: 'user';
		author: Author.User;
	};
	
	export type LLMMessage = Message & {
		role: 'assistant';
		author: Author.LLM;
	};
	
	export type SystemMessage = Message & {
		role: 'system';
		author: Author.System;
	};
}


import type { Author } from './Author';
