import { rehance_MCCGetAll } from "#main/reaxels/chat/wss/mcc-get-all";

export const reaxel_Chat = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		chats:[] as Chat[],
		messages : [] as Message[],
		channels : [] as Channel[],
	} );
	
	const {
		status : chatStatus ,
		setStatus : setChatStatus,
	} = rexaStatus();
	
	//注入开发时数据
	rehance_DevtimeData({
		store,
		setState,
		mutate
	})();
	
	//注册mcc::get[all]的响应,前端请求时返回所有messages,chats,channels
	rehance_MCCGetAll({
		store,
		setState,
		mutate
	})();
	
	//注册新建chat的响应
	rehance_ChatNew({
		store,
		setState,
		mutate
	})();
	
	//注册用户在某个chat中回复的响应
	rehance_ChatReply({
		store,
		setState,
		mutate
	})();
	
	
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
	wssSend ,
} from '#main/services/wss-messager';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '#src/types/Message';
import { Chat } from '#src/types/Chat';
import { LLMRqster } from '#main/services/LLM-requester';
import { Channel } from '#src/types/Channel';
import { rexaStatus } from 'reaxes-toolkit';
import { llmRouter } from "#main/reaxels/chat/LLM-Router";
import { rehance_DevtimeData } from "#main/reaxels/chat/devtime-data";
import { rehance_ChatNew } from "#main/reaxels/chat/wss/chat-new";
import { rehance_ChatReply } from "#main/reaxels/chat/wss/chat-reply";
