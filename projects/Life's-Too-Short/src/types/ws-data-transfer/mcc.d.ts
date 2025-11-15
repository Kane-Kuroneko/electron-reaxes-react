export namespace WS_MCC {
	
	export namespace ClientSend {
		
	}
	
	export namespace ServerSend {
		export type GetAll = {
			channels: Channel[];
			chats: Chat[];
			messages: Message[];
		}
	}
}

import { Channel } from '#src/types/Channel';
import { Chat } from '#src/types/Chat';
import { Message } from '#src/types/Message';
