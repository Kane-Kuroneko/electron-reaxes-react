
export const rehance_ChatNew = ({
	store,
	setState,
	mutate,
}: ReaxelChat) => () => {
	
	wssOn( 'chat::new' , async( ws , data , code ) => {
		try {
			/**
			 * 判断是free-chat还是channel-chat
			 * free-chat-->
			 * 生成chat,先返回前端..
			 * 当api invoke持续吐字时,给前端对应的mes sage_id发送message-update..
			 * 吐字完成后,给前端发送assistant-done ws事件..
			 *
			 */
			const userTextInputs = data.contexts.reduce( ( accu , message ) => {
				if( message.author.role === 'user' )
					return accu + message.contents.filter( it => it.type === 'text' ).map( it => it.text ).join( '\n\n' );
				else
					return accu;
			} , '' );
			
			if( data.client_chat_id && !data.chat_id ) {
				var chat_id = uuidv4();
			} else if( data.chat_id ) {
				var chat_id = data.chat_id;
			}
			
			const {
				summary ,
				intent ,
				topics ,
				confidence ,
				complex,
			} = await llmRouter( { userInput : userTextInputs } );
			
			//先处理messages
			const {
				messagesForModify ,
				messagesForAppend,
			} = data.contexts.reduce( ( accu , it ) => {
				const result = _.cloneDeep( it ) as Message.DraftMessage & Message;
				/*对messages进行分流,已有的和新增的*/
				result.fk_chat_id = chat_id;
				
				if( (
					it as Message.DraftMessage & Message
				).client_message_id && !(
					it as Message
				).message_id ) {
					result.message_id = uuidv4();
					accu.messagesForAppend.push( result as Message.MatchedResponseMessage );
				} else if( (
					it as Message
				).message_id ) {
					const found = store.messages.find( msg => msg.message_id === (
						it as Message
					).message_id );
					if( found )
						accu.messagesForModify.push( result as Message );
				}
				return accu;
			} , {
				messagesForModify : [] as Message[] ,
				messagesForAppend : [] as Message.MatchedResponseMessage[],
			} );
			
			
			/**
			 * 构造预响应Message
			 */
			const resp_message_id = uuidv4();
			const immediateMessage: Message.ImmediateResponsedMessage = {
				message_id : resp_message_id ,
				fk_chat_id : chat_id ,
				author : {
					role : 'assistant' ,
					model : data.model,
				} ,
				contents : [] ,
				done : false ,
			};
			/**
			 * 当router请求完成完成后立即返回Chat,并在实际请求响应时append数据块
			 */
			const immediateChat: Chat.MatchedChat = {
				chat_title : summary ,
				chat_id ,
				client_chat_id : data.client_chat_id ,
				is_free_chat : data.is_free_chat ,
				children : [
					...messagesForModify ,
					...messagesForAppend,
				].map( it => it.message_id ).concat( [ resp_message_id ] ) ,
				fk_channel_id : data.fk_channel_id ,
				created_at : Date.now() ,
				turn_state : 'triaging',
				chat_prompt : data.chat_prompt ,
				disable_turn_context : data.disable_turn_context,
			};
			wssSend( 'chats::update' , {
				chats:_.cloneDeep( [ immediateChat ] ),
			} , 1 );
			wssSend( 'message::update' , {
				messages:_.cloneDeep( [
					...messagesForModify ,
					...messagesForAppend ,
					immediateMessage ,
				] )
			} , 1  );
			
			//合并进store.messages
			mutate( s => {
				if( messagesForAppend.length )
					s.messages = [
						...messagesForAppend ,
						...s.messages ,
					];
				if( messagesForModify.length )
					messagesForModify.forEach( ( it ) => {
						Object.assign( s.messages.find( message => message.message_id === it.message_id ) , it );
					} );
			} );
			
			const {
				done ,
				content ,
				events ,
			} = await LLMRqster.openai.chat( {
				model : data.model ,
				input : data.contexts.map( it => (
					{
						content : it.contents.filter( ( { type } ) => type === 'text' ).map( ( { text }: Message.TextContent ) => text ).join( '\n\n' ) ,
						role : it.author.role,
					}
				) ) ,
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
			console.error( e );
			debugger;
		}
	} );
	
	return {};
};

type ReaxelChat = Pick<typeof import('../').reaxel_Chat, "store" | "setState" | "mutate">;


import {
	wssOn ,
	wssSend ,
} from '#main/services/wss-messager';
import { Chat } from "#src/types/Chat";
import { Message } from "#src/types/Message";
import { v4 as uuidv4 } from 'uuid';
import { LLMRqster } from "#main/services/LLM-requester";
import { llmRouter } from "#main/reaxels/chat/LLM-Router";
