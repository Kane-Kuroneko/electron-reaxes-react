export type Message = {
	message_id: string;
	fk_chat_id: string;
	author: Author;
	content: string|string[];
	role: Message.Role;
	create_time?: number;
	//server和client_BE端使用,当client_FE传此字段时回传
	client_message_id?: string;
};
/**
 * Message代表的是某个独立的信息片段
 */
export namespace Message {
	export type Role = 'user' | 'assistant' | 'system'|'tool';
	
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
	
	//前端发送的消息,此时还不存在message_id,
	export type PendingMessage = Omit<Message, "message_id"> & {
		client_message_id: string;
	};
}


import type { Author } from './Author';
