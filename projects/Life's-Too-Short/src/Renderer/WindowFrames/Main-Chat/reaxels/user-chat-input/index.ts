import {
	wsOn ,
	wsSend,
} from "#renderer/WindowFrames/shared/reaxels/messages-subscriber";

export const SymFreeChat = Symbol('Free-Chat');

//free-chat或channel_id
export type ChatMode = "Free-Chat"|string;

export const reaxel_UserChatInput = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate ,
	} = createReaxable( {
		textArea_UserInputChatText : '简单介绍LLM的工作原理' ,
		select_UserSelectedLLM : 'gpt-5' ,
		select_UserSelectedLanguage : 'zh_CN' as Languages,
		
		chat_mode : "Free-Chat" as ChatMode,
		
		prompts : {
			prompt_contents : [],
			disabled_custom_prompts : false,
			
		},
		
		//用户点发送消息后,等待回执
		pending_client_chat_id : null as string,
		
	} );
	
	const newChat = async() => {
		const user_client_message_id = uuidv4();
		const client_chat_id = uuidv4();
		
		const message: Message.DraftMessage = {
			client_message_id : user_client_message_id ,
			contents : [
				{
					type : 'text' ,
					text : store.textArea_UserInputChatText,
				},
			] ,
			author : { role : 'user' } ,
			fk_chat_id : client_chat_id ,
		};
		const chat: Chat.DraftChat = {
			client_chat_id,
			is_free_chat : store.chat_mode === 'Free-Chat' ,
			chat_title : null ,
			disable_turn_context : null ,
			created_at : null ,
			fk_channel_id : (store.chat_mode !== 'Free-Chat') ? store.chat_mode : null ,
			children : [ user_client_message_id ] ,
			current_node : null ,
			is_do_not_remember : null ,
		};
		setState({
			pending_client_chat_id : client_chat_id, 
		});
		//5s后自动解除监听,清除pending状态, 也就是说用户发起对话5s后如果还未获得相应, 就不会跳转过去了
		setTimeout(() => {
			dispose();
			console.log('超時30s已自動釋放');
			setState({pending_client_chat_id : null});
		},30000);
		const dispose = wsOn('chats-updated',(data, code) => {
			const pendingChat = data.find(it => it.client_chat_id === store.pending_client_chat_id); 
			if(pendingChat){
				outsideNavigate(navigate => {
					navigate(`/chat/${pendingChat.chat_id}`);
				});
				setState({pending_client_chat_id : null});
				dispose();
			}
		});
		wsSend( 'new-chat' , {
			client_chat_id : client_chat_id ,
			contexts : [ message ] ,
			model : 'gpt-5-nano' ,
			is_free_chat : true ,
			fk_channel_id : null ,
			disable_turn_context : null ,
		} , 1000 );
		
	};
	
	const rtn = {
		newChat,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

import {
	IpcRendererInvoke ,
	IpcRendererSend ,
	IpcRendererOn,
} from '#renderer/utils/useIPC';
import { Languages } from "#root/generic-services/refaxels/i18n";
import { v4 as uuidv4 } from 'uuid';
import { Message } from "#src/types/Message";
import { Chat } from "#src/types/Chat";
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import { outsideNavigate } from "#renderer/WindowFrames/shared/hooksAPIOutsideComponents/navigate";

