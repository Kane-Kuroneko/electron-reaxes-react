
if(typeof IPC !== 'undefined'){
	var {wsOn,wsSend} = await import('#renderer/WindowFrames/shared/reaxels/websocket-messager');
}

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
			chat_system_prompt : null as string | null,
			chat_user_info_prompt : null as string | null,
			
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
			turn_state : 'idle',
			is_free_chat : store.chat_mode === 'Free-Chat' ,
			chat_title : null ,
			disable_turn_context : null ,
			created_at : null ,
			chat_prompt : null,
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
		const dispose = wsOn('chats::update',(data, code) => {
			const pendingChat = data.chats.find(it => it.client_chat_id === store.pending_client_chat_id); 
			if(pendingChat){
				outsideNavigate(navigate => {
					navigate(`/chat/${pendingChat.chat_id}`);
				});
				setState({pending_client_chat_id : null});
				dispose();
			}
		});
		wsSend( 'chat::new' , {
			client_chat_id : client_chat_id ,
			contexts : [ message ] ,
			//todo: 构造chat_prompt
			chat_prompt : null ,
			model : 'gpt-5-nano' ,
			is_free_chat : true ,
			fk_channel_id : null ,
			disable_turn_context : null ,
		} , 1 );
	};
	
	const sendToChat = async ({
		chat_id,
	}) => {
		const user_client_message_id = uuidv4();
		const message: Message.DraftMessage = {
			client_message_id : user_client_message_id ,
			contents : [
				{
					type : 'text' ,
					text : store.textArea_UserInputChatText,
				},
			] ,
			author : { role : 'user' } ,
			fk_chat_id : chat_id ,
		};
		wsSend( 'chat::reply' , {
			chat_id ,
			user_replied_message :  message  ,
			model : 'gpt-5-nano' ,
			disable_turn_context : null ,
		} , 1 );
	}
	
	const send = async () => {
		const chat_id = stolenChatId((hookRtn) => hookRtn.chat_id);
		if(chat_id){
			//继续对话
			//先检测是否正在等待
			const chat = reaxel_Chats.store.chats.find(it => it.chat_id === chat_id);
			if(!chat){
				debugger;
			}
			//正在等待中, 则不允许发送新消息
			if(chat.turn_state && chat.turn_state !== 'idle' && chat.turn_state !== 'error'){
				debugger;
				throw new Error('不应该能执行到这, 检查代码');
			}
			if(chat.turn_state === 'idle'){
				const message : Message.DraftMessage = {
					
				}
			}
			
			console.error('無法發送消息, chat_id 不存在');
			return;
		}else {
			//走创建新chat
			newChat();
		} 
	}
	
	const rtn = {
		newChat,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import { stolenChatId } from "#Main-Chat/reaxels/user-chat-input/hook-tunnels/chat.stealth-hook";
import { Languages } from "#root/generic-services/refaxels/i18n";
import { Message } from "#src/types/Message";
import { Chat } from "#src/types/Chat";
import { outsideNavigate } from "#renderer/WindowFrames/shared/hooksAPIOutsideComponents/navigate";
import { v4 as uuidv4 } from 'uuid';
