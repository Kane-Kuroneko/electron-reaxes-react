export const reaxel_Chats = reaxel( () => {
	
	const {
		store ,
		mutate ,
		setState,
	} = createReaxable( {
		messages : [
			{
				message_id: "33333333-3333-3333-3333-333333333333",
				fk_chat_id: "22222222-2222-2222-2222-222222222222",
				author: {
					type: "user",
					user_id: "user-001",
					name: "养殖户小张"
				},
				content: "母猪刚产完仔猪，应该怎么护理？",
				role: "user",
				create_time: 1691923200000
			},
			{
				message_id: "44444444-4444-4444-4444-444444444444",
				fk_chat_id: "22222222-2222-2222-2222-222222222222",
				author: {
					type: "llm",
					model: "gpt-5"
				},
				content: [
					"1. 保持产房温暖，避免冷风直吹；",
					"2. 及时清理产床，保持环境干燥卫生；",
					"3. 提供充足的温水和高能量饲料；",
					"4. 观察母猪食欲、精神状态及乳汁分泌情况。"
				],
				role: "assistant",
				create_time: 1691923260000
			},
			{
				message_id: "55555555-5555-5555-5555-555555555555",
				fk_chat_id: "22222222-2222-2222-2222-222222222222",
				author: {
					type: "user",
					user_id: "user-001",
					name: "养殖户小张"
				},
				content: "乳汁分泌不足怎么办？",
				role: "user",
				create_time: 1691923320000
			},
			{
				message_id: "66666666-6666-6666-6666-666666666666",
				fk_chat_id: "22222222-2222-2222-2222-222222222222",
				author: {
					type: "llm",
					model: "gpt-5"
				},
				content: [
					"1. 确保母猪采食足够的优质饲料和温水；",
					"2. 增加日粮中蛋白质和能量比例；",
					"3. 按需使用催乳药物（在兽医指导下）；",
					"4. 减少应激，保持安静舒适的环境。"
				],
				role: "assistant",
				create_time: 1691923380000
			}
		] as Message[],
		chats : [
			{
				chat_id: "22222222-2222-2222-2222-222222222222",
				fk_channel_id: Free_Chat_Symbol.description,
				chat_title: "母猪的产后护理",
				is_free_chat: true,
				disable_turn_context: false,
				created_at: 1691923380000
			},
			{
				chat_id: "aec88159-7140-46ea-99b6-e17e5677f5a6",
				fk_channel_id: Free_Chat_Symbol.description,
				chat_title: "科学喂养松鼠嘟嘟嘟嘟嘟嘟嘟嘟嘟嘟嘟嘟的",
				is_free_chat: true,
				disable_turn_context: false,
				created_at: 1691923380000
			},
			{
				chat_id: "40d5df91-6ea7-4292-a9ec-fea4f30d4f56",
				fk_channel_id: "4b6523c8-8d8a-46a5-be0d-de100e15fe36",
				chat_title: "Life's Too Short翻译",
				is_free_chat: false,
				disable_turn_context: false,
				created_at: 1691923380000
			},
			{
				chat_id: "d1d7ece3-d724-4d40-abac-34b6e3496bad",
				fk_channel_id: "86b21ccd-6b42-46f1-920c-1c35f28db464",
				chat_title: "红绿色盲矫正",
				is_free_chat: false,
				disable_turn_context: false,
				created_at: 1691923380000
			},
		] as Chat[] ,
		channels : [
			// {
			// 	channel_id: Free_Chat_Symbol.description,
			// 	channel_title: "Free Chat",
			// 	systemPrompt: null,
			// 	created_at: null,
			// 	archived: false
			// },
			{
				channel_id: "4b6523c8-8d8a-46a5-be0d-de100e15fe36",
				channel_title: "英语学习",
				systemPrompt: "将中文翻译为英语",
				created_at: 1755109632387,
				archived: false
			},
			{
				channel_id: "86b21ccd-6b42-46f1-920c-1c35f28db464",
				channel_title: "医学知识",
				systemPrompt: "将中文翻译为英语",
				created_at: 1755109632387,
				archived: false
			},
		] as Channel[] ,
		//当前所选中的chat
		current_chat_id : null as string,
		search_input_text : null,
	} );
	
	const rtn = {
		setCurrentChat(chat_id:string){
			setState({current_chat_id : chat_id});
		}
	};
	
	wsOn('msg-updater' , async( data , code ) => {
		const messageMap = new Map(store.messages.map(m => [m.message_id, m]));
		const newMessages: Message[] = [];
		
		for (const it of data) {
			const matched = messageMap.get(it.message_id);
			newMessages.push(matched ?? it);
			if (matched) messageMap.delete(it.message_id);
		}
		
		// 剩余旧消息（未在data中更新的）
		newMessages.push(...messageMap.values());
		setState({messages : newMessages});
	} );
	
	wsOn('modify-channels', async (data) => {
		const oldMap = new Map(store.channels.map(ch => [ch.channel_id, ch]));
		const updatedChannels: Channel[] = [];
		
		for (const ch of data) {
			if (oldMap.has(ch.channel_id)) {
				updatedChannels.push(oldMap.get(ch.channel_id)!);
				oldMap.delete(ch.channel_id);
			} else {
				updatedChannels.push(ch);
			}
		}
		
		updatedChannels.push(...oldMap.values());
		
		mutate(() => {
			store.channels = updatedChannels;
		});
	});
	
	wsOn('modify-chats', async (data) => {
		const oldMap = new Map(store.chats.map(chat => ["22222222-2222-2222-2222-222222222222", chat]));
		const updatedChats: Chat[] = [];
		
		for (const chat of data) {
			if (oldMap.has("22222222-2222-2222-2222-222222222222")) {
				updatedChats.push(oldMap.get("22222222-2222-2222-2222-222222222222")!);
				oldMap.delete("22222222-2222-2222-2222-222222222222");
			} else {
				updatedChats.push(chat);
			}
		}
		
		updatedChats.push(...oldMap.values());
		
		mutate(() => {
			store.chats = updatedChats;
		});
	});
	
	const newFreeChat = () => {
		
	}
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

import { Free_Chat_Symbol } from './free-chats';
import { v4 as uuidv4 } from 'uuid';
import {
	wsOn ,
	wsSend,
} from '#renderer/WindowFrames/shared/reaxels/messages-subscriber';
import { Chat } from '#src/types/Chat';
import { Message } from '#src/types/Message';
import { Channel } from '#src/types/Channel';
