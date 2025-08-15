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
		
		
	} );
	
	
	const {
		status : chatStatus ,
		setStatus : setChatStatus,
	} = rexaStatus();
	

	obsReaction(() => {
		wssSend( 'msg-updater' , store.messages , 1000 );
	},() => [
		store.messages
	])
	
	
	IpcMainOn( 'llm-chat' ).on( async( e , data ) => {
		try {
			const {
				done ,
				content ,
				events,
			} = await LLMRqster.openai( {
				model : data.model ,
				input : [
					{
						content : "今天是什么日子?" ,
						role : 'user' ,
						// message_id:''
					} ,
				] ,
				stream : true ,
			} );
			console.log(JSON.parse(JSON.stringify({content,events})));
			
			obsReaction( () => {
				
			} , () => [content.length] );
			
		} catch ( e ) {
			console.error( e );
		}
	} );
	
	IpcMainOn( 'new-channel' ).on( ( e , data , reply ) => {
		
	} );
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
