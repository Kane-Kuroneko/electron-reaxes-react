namespace WS_Chat {
	export namespace ClientSend {
		export type New = {
			chat_id?: string;
			client_chat_id: string;
			model: ( typeof import('#src/shared/LLM-Models')['LLMModels'] )[number]['value'],
			is_free_chat: boolean;
			fk_channel_id: string | null;
			disable_turn_context?: boolean;
			chat_prompt: Chat.ChatPrompt;
			contexts: ( Message.DraftMessage | Message )[];
		};
		
		export type Reply = {
			chat_id: string;
			model: Model,
			user_replied_message: ( Message.DraftMessage | Message );
			// fk_channel_id: string | null;
			disable_turn_context?: boolean;
			chat_prompt?: Partial<Chat.ChatPrompt>;
		};
		
		export type Delete_from_turn_inclusive = {
			chat_id:string;
			message_id:string;
		}
	}
	export namespace ServerSend {
		export type update = {
			chats : Chat.MatchedChat[]
		}
	}
}


import { type Model } from '#src/types/Model';
import { type Message } from '#src/types/Message';
import { type Chat } from '#src/types/Chat';
