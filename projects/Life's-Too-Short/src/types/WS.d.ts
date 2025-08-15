type T<Data,Code> = {
	data : Data,
	code : Code,
}  

export namespace WS {
	export type ClientSend = {
		
	}
	
	export type ServerSend = {
		'msg-updater': T<Message[] , 1000>;
		'modify-channels': T<Channel[] , 1000>;
		'modify-chats': T<Chat[] , 1000>;
	}
}


import { Message } from '#src/types/Message';
import { Channel } from '#src/types/Channel';
import { Chat } from '#src/types/Chat';
