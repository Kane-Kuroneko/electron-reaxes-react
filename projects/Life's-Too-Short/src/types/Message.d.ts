export type Message = {
	message_id: string;
	fk_chat_id: string;
	author: Author; // role 对应 system/user/assistant/tool
	contents: Message.MessageContent[];
	create_time?: number;
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
	
	export type PartialMessage = Partial<Message> & {
		message_id:string;
		done?:boolean;
	}
	
	//前端发送的消息,此时还不存在message_id,
	export type DraftMessage = Omit<Message , "message_id"> & {
		client_message_id: string;
	};
	//Stream模式下 ,后端立即返回给前端一个空壳结构,后续往里填充content
	export type ImmediateResponsedMessage = Message & {
		done:boolean;
	}
	//服务端生成message_id且与client_message_id并存
	export type MatchedResponseMessage = Message & {
		client_message_id: string;
	}
	
	export type TextContent = {
		type: 'text';
		text: string;
	};
	
	export type ImageContent = {
		type: 'image_url';
		image_url: string; // URL 或 base64
	};
	
	// 文件不在 chat.completions 直接使用
	// 仅保存 file_id（来自 /files 上传）
	export type FileReference = {
		type: 'file_ref';
		file_id: string;
		filename?: string;
	};
	
	export type MessageContent = TextContent | ImageContent | FileReference;
	
	
}


import type { Author } from './Author';
