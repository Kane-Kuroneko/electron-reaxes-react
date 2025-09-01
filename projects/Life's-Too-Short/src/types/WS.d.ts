type T<Data,Code> = {
	data : Data,
	code : Code,
}  

export namespace WS {
	export type ClientSend = {
		'new-chat' : T<{
			chat_id?:string;
			client_chat_id : string;
			model : (typeof import('#src/shared/LLM-Models')['LLMModels'])[number]['value'],
			is_free_chat:boolean;
			fk_channel_id:string|null;
			disable_turn_context?:boolean;
			contexts: (Message.DraftMessage|Message)[];
		},1000>
	}
	
	export type ServerSend = {
		'messages-updated': T<Message.PartialMessage[] , 1000>;
		'channels-updated': T<Channel[] , 1000>;
		'chats-updated': T<Chat.MatchedChat[] , 1000>;
	}
}

import { Message } from '#src/types/Message';
import { Channel } from '#src/types/Channel';
import { Chat } from '#src/types/Chat';
