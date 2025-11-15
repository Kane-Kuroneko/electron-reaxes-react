type T<Data,Code> = {
	data : Data,
	code : Code,
}  

export namespace WS {
	export type ClientSend = {
		'chat::new' : T<WS_Chat.ClientSend.New,1>;
		
		'chat::reply' : T<WS_Chat.ClientSend.Reply,1>;
		
		'chat::delete_from_turn_inclusive' : T<WS_Chat.ClientSend.Delete_from_turn_inclusive,1>;
		
		'channel::new' : T<WS_Channel.ClientSend.New,1>;
		
		'channel::update' : T<WS_Channel.ClientSend.Update,1>;
		
		'channel::delete' : T<WS_Channel.ClientSend.Delete,1>;
		
		//从后端拿预设提示词,如果不写query,则拿所有
		'quick-prompts-presets::get' : T<WS_QuickPrompt.Get,1>;
		'quick-prompt::update' : T<WS_QuickPrompt.Get,1>;
		//mcc即message&chat&channel.此接口用于初次加载时获取所有数据
		'mcc::get[all]' : T<null,1>;
	}
	
	export type ServerSend = {
		'message::update': T<WS_Message.ServerSend.update , 1>;
		'channels::updated': T<WS_Channel.ServerSend.update , 1>;
		'chats::update': T<WS_Chat.ServerSend.update, 1>;
		//mcc即message&chat&channel.此接口用于当前端send mcc::get[all]后服务端返回所有数据
		'mcc::get[all]' : T<WS_MCC.ServerSend.GetAll,1>;
	}
}


import { type WS_Chat } from './ws-data-transfer/chat';
import { type WS_Channel } from './ws-data-transfer/channel';
import { type WS_QuickPrompt } from './ws-data-transfer/quick-prompt-presets';
import { type WS_Message } from './ws-data-transfer/message';
import { type WS_MCC } from './ws-data-transfer/mcc';
