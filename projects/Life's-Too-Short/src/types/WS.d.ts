type T<Data,Code> = {
	data : Data,
	code : Code,
}  

export namespace WS {
	export type ClientSend = {
		'new-chat' : T<{
			inputs : Message['contents'];
			chat_temp_id : string;
			model : (typeof import('#src/shared/LLM-Models')['LLMModels'])[number]['value']
		},1000>
	}
	
	export type ServerSend = {
		'messages-updated': T<Message[] , 1000>;
		'channels-updated': T<Channel[] , 1000>;
		'chats-updated': T<Chat[] , 1000>;
	}
}

import { Message } from '#src/types/Message';
import { Channel } from '#src/types/Channel';
import { Chat } from '#src/types/Chat';
