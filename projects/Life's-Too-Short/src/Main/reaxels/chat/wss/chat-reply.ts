import { LLMRqster } from "#main/services/LLM-requester";

/**
 * 用户在某个chat中回复了一条消息
 * 1.如果是新消息,则生成message_id,并插入messages数组头部
 * 2.如果是已有消息重发,则不生成message_id,直接使用已有的message_id
 * 3.将message_id插入对应chat的children数组尾部
 * 4.将用户的面板设置应用过来
 * 5.返回前端message::update事件
 */
export const rehance_ChatReply = ({
	store,
	setState,
	mutate,
}: ReaxelChat) => () => {
	
	wssOn( 'chat::reply' , async( ws , data , code ) => {
		try {
			/**
			 * 判断是free-chat还是channel-chat
			 * free-chat-->
			 * 生成chat,先返回前端..
			 * 当api invoke持续吐字时,给前端对应的mes sage_id发送message-update..
			 * 吐字完成后,给前端发送assistant-done ws事件..
			 *
			 */
			const userTextInputs = data.user_replied_message.contents.filter( it => it.type === 'text' ).map( it => it.text ).join( '\n\n' );
			
			const {
				summary ,
				intent ,
				topics ,
				confidence ,
				complex ,
			} = await llmRouter( { userInput : userTextInputs } );
			
			let message_id:string ;
			
			mutate( s => {
				
				//处理messages=================
				const message = s.messages.find( msg => msg.message_id === message_id );
				if( !message && 'client_message_id' in data.user_replied_message ) {
					message_id = `messageid_${ uuidv4() }`;
					const newMessage = {
						message_id ,
						client_message_id : data.user_replied_message.client_message_id ,
						fk_chat_id : data.chat_id ,
						contents : data.user_replied_message.contents ,
						author : data.user_replied_message.author ,
						create_time : data.user_replied_message.create_time ,
					};
					
					s.messages.unshift( {
						message_id ,
						fk_chat_id : data.chat_id ,
						contents : data.user_replied_message.contents ,
						author : data.user_replied_message.author ,
						create_time : data.user_replied_message.create_time ,
					} );
					
					//如果非重发消息,那么还需要将前端的新message回传前端
					wssSend( 'message::update' , {messages:[newMessage]} , 1 );
					
					
				} else if ('message_id' in data.user_replied_message ) {
					//如果有相同的message_id,说明是已有消息重发
					message_id = data.user_replied_message.message_id;
				}
				
				//处理chat=================
				const chat = s.chats.find( chat => chat.chat_id === data.chat_id );
				if( chat ) {
					//将用户的面板设置应用过来
					if( data.disable_turn_context ) {
						chat.disable_turn_context = data.disable_turn_context;
					}
					if( data.model ) {
						chat.model = data.model;
					}
					if( data.chat_prompt ) {
						chat.chat_prompt = data.chat_prompt;
					}
					
					if( 'message_id' in data.user_replied_message ) {//有message_id说明是已有消息重发
						chat.children.push( data.user_replied_message.message_id );
					} else {
						chat.children.push( message_id );
					}
					
				} else {
					debugger;
					console.error( 'chat not found,check out the logic' );
				}
				
			} );
			const resp_message_id = createID.messageid();
			const immediateMessage: Message.ImmediateResponsedMessage = {
				message_id : resp_message_id ,
				fk_chat_id : data.chat_id ,
				author : {
					role : 'assistant' ,
					model : data.model,
				} ,
				contents : [] ,
				done : false ,
			};
			const {content,events,done} = await LLMRqster.openai.chat( {
				model : data.model ,
				input : data.user_replied_message.contents.filter( it => it.type === 'text' ).map( it => {
					return {
						role : data.user_replied_message.author.role ,
						content : it.text ,
					};
				} ) ,
				stream : true ,
			} );
			const dis = obsReaction( ( first , disposer ) => {
				// console.log(JSON.parse(JSON.stringify({content,events})));
				console.log( content.join( '' ) );
				wssSend( 'message::update' , {
					messages:[
						{
							message_id : immediateMessage.message_id ,
							contents : [
								{
									type : 'text' ,
									text : content.join( '' ),
								},
							],
						},
					],
				} , 1 );
			} , () => [ content.length ] );
			
			done.finally( dis );
			done.then( ( {
				events ,
				content ,
				root,
			} ) => {
				const result = JSON.parse( JSON.stringify( {
					events ,
					root ,
					content ,
				} ) );
				wssSend( 'message::update' , {
					messages:[
						{
							message_id : immediateMessage.message_id ,
							done : true ,
						},
					]
				} , 1 );
				// debugger;
			} );
		} catch ( e ) {
		}
	} );
		
	return {};
};

type ReaxelChat = Pick<typeof import('../').reaxel_Chat, "store" | "setState" | "mutate">;


import {
	wssOn ,
	wssSend ,
} from '#main/services/wss-messager';
import { v4 as uuidv4 } from 'uuid';
import { llmRouter } from "#main/reaxels/chat/LLM-Router";
import { Message } from "#src/types/Message";
import { createID } from "#main/utils/createID";
