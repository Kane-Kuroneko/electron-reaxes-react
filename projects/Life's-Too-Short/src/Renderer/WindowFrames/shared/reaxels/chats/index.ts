import { reaxel_UserChatInput } from "#Main-Chat/reaxels/user-chat-input";

export const reaxel_Chats = reaxel( () => {
	
	const {
		store ,
		mutate ,
		setState,
	} = createReaxable( {
		"messages": [
			// 母猪的产后护理
			{
				"message_id": "33333333-3333-3333-3333-333333333333",
				"fk_chat_id": "22222222-2222-2222-2222-222222222222",
				"author": {
					"role": "user",
					"user_id": "user-001",
					"name": "养殖户小张"
				},
				"contents": [
					{
						"type": "text",
						"text": "母猪的产后护理？"
					}
				],
				"create_time": 1691923200000
			},
			{
				"message_id": "55555555-5555-5555-5555-555555555555",
				"fk_chat_id": "22222222-2222-2222-2222-222222222222",
				"author": {
					"role": "assistant",
					"model": "gpt-5"
				},
				"contents": [
					{
						"type": "text",
						"text": "母猪的产后护理主要包括以下几个方面：  \n\n**1. 保持环境清洁与温度适宜**  \n- 产房应干燥、清洁、通风，避免潮湿和粪尿污染。  \n- 保持产床温度在 18–22℃ 左右，仔猪区可适当提高至 30–32℃，避免母仔温度需求冲突。  \n\n**2. 产后观察**  \n- 产后 24 小时密切观察母猪是否有食欲、精神、体温变化。  \n- 警惕子宫炎、产后瘫痪、乳房炎等常见疾病。若发现发热、厌食或乳头硬结，应及时处理。  \n\n**3. 饮食与水分**  \n- 产后立即提供温净水，保证充足饮水。  \n- 初期喂易消化、清淡的饲料（如麸皮稀粥），防止消化不良。  \n- 逐步恢复到正常饲料量，避免过度饲喂造成乳热或便秘。  \n\n**4. 子宫恢复与排恶露**  \n- 正常母猪会在产后几天内排出恶露，应保持产床清洁，防止细菌感染。  \n- 若恶露有臭味或时间过长，应考虑子宫炎并及时治疗。  \n\n**5. 乳房与哺乳管理**  \n- 保持乳头清洁，防止仔猪吸吮时带入细菌。  \n- 检查乳汁分泌是否正常，防止乳腺炎或无乳症。  \n- 防止仔猪争奶，必要时进行人工辅助哺乳或调仔。  \n\n**6. 健康预防**  \n- 根据需要进行产后补钙、补铁或抗生素预防（依场管理制度与兽医建议）。  \n- 有条件的养殖场会给母猪补充维生素和微量元素，以加快恢复。  \n\n**7. 运动与康复**  \n- 产后适度让母猪活动，有助于子宫恢复和排泄顺畅。  \n\n总结：母猪产后护理核心在于 **环境清洁、营养合理、疾病预防和仔猪哺乳管理**，一旦发现异常应尽快处理，以减少母仔死亡率。"
					}
				],
				"create_time": 1691923320000
			},
			
			// 如何科学喂养松鼠
			{
				"message_id": "23c0d795-498a-4cea-a503-6dc5ea9b46dd",
				"fk_chat_id": "aec88159-7140-46ea-99b6-e17e5677f5a6",
				"author": {
					"role": "user",
					"user_id": "user-001",
					"name": "松鼠喂养专家"
				},
				"contents": [
					{
						"type": "text",
						"text": "如何科学喂养松鼠？"
					}
				],
				"create_time": 1691923200000
			},
			{
				"message_id": "ef133dd7-e559-4976-a6ee-154cbedafac8",
				"fk_chat_id": "aec88159-7140-46ea-99b6-e17e5677f5a6",
				"author": {
					"role": "assistant",
					"model": "gpt-5"
				},
				"contents": [
					{
						"type": "text",
						"text": "科学饲养松鼠的核心在于**模拟其自然食性**，保证营养均衡，避免因人类食物或单一喂养方式导致健康问题。主要要点如下：  \n\n---\n\n### 1. 主食（坚果与种子）\n- **原生态坚果**：松子、榛子、核桃、板栗、榛子等，但必须去壳并且**不加盐、不烘焙、不调味**。  \n- **种子类**：南瓜子、葵花籽，但不能过量，油脂高，易导致肥胖和肝脏负担。  \n\n👉 建议：坚果类占日常饮食 **30-40%**，避免单一喂食。\n\n---\n\n### 2. 辅助食物（水果与蔬菜）\n- **水果**：苹果、葡萄、梨、蓝莓、香蕉（少量）。避免柑橘类过多，酸度较高。  \n- **蔬菜**：胡萝卜、玉米、黄瓜、红薯、豌豆等。  \n- **注意**：水果糖分高，比例不宜超过总食物的 **20%**。  \n\n---\n\n### 3. 蛋白质来源\n松鼠在野外会吃昆虫、鸟蛋。人工饲养时可适量提供：  \n- 煮熟的鸡蛋碎少量  \n- 面包虫、黄粉虫（干/活）  \n- 少量无盐奶酪或酸奶  \n\n---\n\n### 4. 必需的咀嚼物\n松鼠牙齿终身生长，必须不断啃咬：  \n- 硬壳坚果  \n- 无毒树枝（苹果树、梨树、榆树等枝条，避免桃树、樱桃等含氰树木）  \n- 专门的磨牙木  \n\n---\n\n### 5. 饮水\n- 必须提供**干净的清水**，不能用牛奶代替（牛奶含乳糖，松鼠消化不良）。  \n- 使用宠物用饮水瓶，避免水碗被打翻。  \n\n---\n\n### 6. 禁止食物\n- 巧克力、咖啡因类（毒性）  \n- 含盐、含糖、油炸食品  \n- 牛奶及奶制品（大量）  \n- 洋葱、大蒜、辣椒等刺激性食物  \n\n---\n\n### 7. 饲喂方式\n- **少量多餐**：每天 2-3 次，避免一次大量囤积或浪费。  \n- **环境模拟**：可以将食物藏在笼子或树枝间，让松鼠自行寻找，保持活动和探索性。  \n- **避免过度投喂**：松鼠容易肥胖，肥胖会导致代谢问题。  \n\n---\n\n### 8. 补充与监测\n- 可适当补充宠物用多维矿物粉，尤其是钙质，预防骨骼软化。  \n- 观察毛发、体重、牙齿生长情况，若出现异常需调整饮食。  \n\n---\n\n结论：松鼠科学喂养的原则是**以天然坚果为主，蔬果和蛋白质为辅，严格避免人类加工食品，并保证磨牙需求和清洁饮水**。"
					}
				],
				"create_time": 1691923320000
			}
		] as const as Message[],
		"chats" : [
			{
				"chat_id": "22222222-2222-2222-2222-222222222222",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "母猪的产后护理",
				"is_free_chat": true,
				"disable_turn_context": false,
				"children" : ["33333333-3333-3333-3333-333333333333","55555555-5555-5555-5555-555555555555"],
				"created_at": 1691923380000
			},
			{
				"chat_id": "aec88159-7140-46ea-99b6-e17e5677f5a6",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "科学喂养松鼠",
				"is_free_chat": true,
				"disable_turn_context": false,
				"children" : ["23c0d795-498a-4cea-a503-6dc5ea9b46dd","ef133dd7-e559-4976-a6ee-154cbedafac8"],
				"created_at": 1691923380000,
				"prompts" : {
					channel_prompts : {},
					chat_prompts : {},
					
				}
			},
		] as const as Chat[] ,
		"channels" : [
			{
				"channel_id" : "4b6523c8-8d8a-46a5-be0d-de100e15fe36" ,
				"channel_title" : "英语学习" ,
				"systemPrompt" : "将中文翻译为英语" ,
				"created_at" : 1755109632387 ,
				"archived" : false,
			} ,
		] as Channel[] ,
		//当前所选中的chat
		current_chat_id : null as string,
		search_input_text : null,
	} );
	
	if(IPC){
		var wsPromise = import('#renderer/WindowFrames/shared/reaxels/messages-subscriber').then(({wsOn,wsSend}) => ({wsOn,wsSend}));
		wsPromise.then(({wsOn,wsSend}) => {
			wsOn('messages-updated', async (data, code) => {
				const oldMap = new Map(store.messages.map(m => [m.message_id, m]));
				const dataMap = new Map(data.map(it => [it.message_id, it]));
				const newMessagesList: Message[] = [];
				
				// Collect new messages in the order they appear in data.messages
				for (const it of data) {
					//新消息,放入队列等待合并
					if (!oldMap.has(it.message_id)) {
						newMessagesList.push(it as Message);
					}else {
						//旧消息,直接mutable修改
						const oldM = oldMap.get(it.message_id);
						mutate(() => {
							Object.assign(oldM,it);
						})
						
					}
				}
				setState({ messages: [...newMessagesList, ...store.messages] });
			});
			
			wsOn('channels-updated', async (data) => {
				const oldMap = new Map(store.channels.map(ch => [ch.channel_id, ch]));
				const dataMap = new Map(data.map(ch => [ch.channel_id, ch]));
				const newChannels: Channel[] = [];
				const updatedChannels: Channel[] = [];
				
				// Collect new channels in the order they appear in data
				for (const ch of data) {
					if (!oldMap.has(ch.channel_id)) {
						newChannels.push(ch);
					}
				}
				
				// Preserve original order for existing channels, applying updates where available
				for (const oldCh of store.channels) {
					if (dataMap.has(oldCh.channel_id)) {
						const newCh = dataMap.get(oldCh.channel_id);
						updatedChannels.push(newCh);
					} else {
						updatedChannels.push(oldCh);
					}
				}
				
				mutate(() => {
					store.channels = [...newChannels, ...updatedChannels];
				});
			});
			
			wsOn('chats-updated', async (data) => {
				const oldMap = new Map(store.chats.map(chat => [chat.chat_id, chat]));
				// const dataMap = new Map(data.map(chat => [chat.chat_id, chat]));
				const newChats: Chat[] = [];
				// Collect new chats in the order they appear in data
				for (const chat of data) {
					//新增chat
					if (!oldMap.has(chat.chat_id)) {
						newChats.push({
							chat_id: chat.chat_id,
							// client_chat_id : chat.client_chat_id,
							disable_turn_context: chat.disable_turn_context,
							created_at: chat.created_at,
							fk_channel_id: chat.fk_channel_id,
							is_free_chat: chat.is_free_chat,
							current_node: null,
							chat_title: chat.chat_id,
							children: chat.children,
							is_do_not_remember: chat.is_do_not_remember,
						});
					}else {
						//已有chat直接合并
						const oldChat = oldMap.get(chat.chat_id);
						mutate(() => {
							Object.assign(oldChat,chat);
						})
					}
				}
				
				mutate(() => {
					store.chats = [...newChats, ...store.chats];
				});
			});
		})
	}
	//@ts-ignore
	window.chats = () => {
		return JSON.parse(JSON.stringify(store.chats))
	}
	//@ts-ignore
	window.messages = () => {
		return JSON.parse(JSON.stringify(store.messages))
	}
	
	const rtn = {
		setCurrentChat(chat_id:string){
			setState({current_chat_id : chat_id});
		},
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

import { xImport } from 'reaxes-utils';
import { IPC } from '#renderer/ENV/electron';
import { Free_Chat_Symbol } from './free-chats-symbol';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from '#src/types/Chat';
import { Message } from '#src/types/Message';
import { Channel } from '#src/types/Channel';
import { decodeQueryString } from 'reaxes-utils';
