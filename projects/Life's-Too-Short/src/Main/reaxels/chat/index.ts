export const reaxel_Chat = reaxel( () => {
	
	const statics = {
		models : {
			
		}
	};
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		chats:[
			
		] as Chat[],
		messages : [] as Message[],
		Channels : [] as Channel[],
		
	} );
	
	
	const {
		status : chatStatus ,
		setStatus : setChatStatus,
	} = rexaStatus();
	

	obsReaction(() => {
		wssSend( 'messages-updated' , store.messages , 1000 );
	},() => [
		store.messages
	])
	
	wssOn('new-chat',async (ws, data, code) => {
		try {
			/**
			 * 判断是free-chat还是channel-chat
			 * free-chat-->
			 * 生成chat,先返回前端..
			 * 当api invoke持续吐字时,给前端对应的message_id发送message-update..
			 * 吐字完成后,给前端发送assistant-done ws事件..
			 * 
			 */
			const textInput = data.inputs.filter(it => it.type === 'text').reduce((accu:string,it:Message.TextContent) => `${accu} \n\n ${it.text}`,'');
			
			const chat_id = uuidv4();
			
			const llmRouter = async() => {
				const prompt = `你是一个对话标题生成器和意图分析器。你的任务是根据用户输入的对话内容，生成一个简洁的聊天标题，并评估其复杂程度。

请严格遵守以下规则：
1. 你的输出必须是一个有效的、不带任何额外文本的 JSON 对象。
2. JSON 对象中必须包含以下两个字段：
   - "summary": string，这是一个用于表示聊天主题的简洁标题，长度不超过15个汉字或字符。
   - "complex": number，这是一个介于 1 到 5 之间的整数，用于评估用户请求的复杂程度。1表示简单（如：问候、闲聊、简单查询），5表示非常复杂（如：需要多步操作、包含多个主题或深层技术问题）。

示例：
用户输入：“帮我查一下今天北京的天气怎么样？”
你的输出：{"summary":"北京天气查询","complex":1}`;;
				
				LLMRqster.openai.chat<{ content: string }>( {
					model : 'gpt-5-nano' ,
					input : [
						{
							content : prompt ,
							role : 'system' ,
							// message_id:''
						} ,
						{
							content : textInput ,
							role : 'user',
						},
					] ,
					stream : false ,
				} ).then(s => {
					debugger;
				}).catch(e => {
					debugger;
				});
			};
			
			try {
				llmRouter().then((r) => {
					debugger;
				}).catch(e => {
					debugger;
				});
				debugger;
			}catch ( e ) {
				
			}
			return;
			const chat:Chat = {
				chat_title : NaN,
				chat_id,
				children:[chat_id],
				is_free_chat : data.is_free_chat,
				fk_channel_id : data.fk_channel_id,
				created_at:Date.now(),
				disable_turn_context:data.disable_turn_context
			};
			
			wssSend('messages-updated')
			const {
				done ,
				content ,
				events,
			} = await LLMRqster.openai( {
				model : data.model ,
				input : [
					{
						content : textInput ,
						role : 'user' ,
						// message_id:''
					} ,
				] ,
				stream : true ,
			} );
			console.log(JSON.parse(JSON.stringify({content,events})));
			
			const dis = obsReaction( (first, disposer) => {
				
			} , () => [content.length] );
			
			done.finally(dis);
			
		} catch ( e ) {
			console.error( e );
		}
	})
	
	IpcMainOn( 'new-channel' ).on( ( e , data , reply ) => {
		
	} );
	
	
	const rtn = {
		get chatRequestStatus() {
			return chatStatus;
		},
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

import {
	wssOn ,
	wssSend,
} from '#main/services/wss-messager';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '#src/types/Message';
import { Chat } from '#src/types/Chat';
import { OpenAI } from '#main/services/LLM-requester/openai/type';
import { LLMRqster } from '#main/services/LLM-requester';
import type { Channel } from '#src/types/Channel';
import { rexaStatus } from 'reaxes-toolkit';
import createUUID from 'uuid';
import { OPENAI_API_KEY } from '#project/.env.json';
import {
	IpcMainOn ,
	IpcMainHandle ,
	useIpcSend,
} from '#main/utils/useIPC';
import {WebSocketServer} from 'ws';
