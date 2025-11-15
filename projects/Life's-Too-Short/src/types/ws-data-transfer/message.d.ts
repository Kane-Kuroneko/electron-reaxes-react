namespace WS_Message {
	export namespace ClientSend {
		
	}
	export namespace ServerSend {
		export type update = {
			messages: Message.PartialMessage[];
		}
	}
}


import { type Model } from '#src/types/Model';
import { type Message } from '#src/types/Message';
import { type Chat } from '#src/types/Chat';
