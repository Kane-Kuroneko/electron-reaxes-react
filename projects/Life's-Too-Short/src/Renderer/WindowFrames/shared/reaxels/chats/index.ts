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
			{
				"chat_id": "40d5df91-6ea7-4292-a9ec-fea4f30d4f56",
				"fk_channel_id": "4b6523c8-8d8a-46a5-be0d-de100e15fe36",
				"chat_title": "Life's Too Short翻译",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1691923380000
			},
			{
				"chat_id": "d1d7ece3-d724-4d40-abac-34b6e3496bad",
				"fk_channel_id": "86b21ccd-6b42-46f1-920c-1c35f28db464",
				"chat_title": "红绿色盲矫正",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1691923380000
			},
			{
				"chat_id": "f4c9fb6b-da53-45d9-b9ef-0339c9f6d4bf",
				"fk_channel_id": "8f7df1ce-3062-4b41-87fe-8f148f39d397",
				"chat_title": "数学问题 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "9130adc8-551b-4ec7-9f25-a06f364616e2",
				"fk_channel_id": "8f7df1ce-3062-4b41-87fe-8f148f39d397",
				"chat_title": "数学问题 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "05a8305c-a230-4fa5-80de-a0d74fc34b8a",
				"fk_channel_id": "8f7df1ce-3062-4b41-87fe-8f148f39d397",
				"chat_title": "数学问题 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "a444e290-75e9-4f1b-a9b1-0ea54cf0f9e3",
				"fk_channel_id": "988d3983-46ba-4d60-a1f7-9f76442d0fb3",
				"chat_title": "编程帮助 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "737e5708-a9cb-4feb-a6f1-3a8cbe2aef10",
				"fk_channel_id": "988d3983-46ba-4d60-a1f7-9f76442d0fb3",
				"chat_title": "编程帮助 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "c1358053-e3cf-449f-9dc3-49e0f06f5f7b",
				"fk_channel_id": "988d3983-46ba-4d60-a1f7-9f76442d0fb3",
				"chat_title": "编程帮助 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "974b3152-956a-4799-b100-4efbc875fcd3",
				"fk_channel_id": "449c6434-c5a4-4772-b42e-a12a5f9919ed",
				"chat_title": "历史事件 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "ec238a96-b776-4fcc-93b0-c32ce4ddba86",
				"fk_channel_id": "449c6434-c5a4-4772-b42e-a12a5f9919ed",
				"chat_title": "历史事件 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "054e6c12-4156-49a0-91a2-0dae98d54124",
				"fk_channel_id": "449c6434-c5a4-4772-b42e-a12a5f9919ed",
				"chat_title": "历史事件 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "8d2d1433-1144-413b-8f9b-0dda8fe2623a",
				"fk_channel_id": "449c6434-c5a4-4772-b42e-a12a5f9919ed",
				"chat_title": "历史事件 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "f94021ee-94fd-44a7-9f22-7596e4d0eba9",
				"fk_channel_id": "8d71517b-b4b0-44a2-bda7-0d803434b5ba",
				"chat_title": "科技新闻 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "48191172-8b23-4d1b-bda8-de2f736f4af6",
				"fk_channel_id": "8d71517b-b4b0-44a2-bda7-0d803434b5ba",
				"chat_title": "科技新闻 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "197947d9-fa95-468f-a07a-f7e9f959f756",
				"fk_channel_id": "8d71517b-b4b0-44a2-bda7-0d803434b5ba",
				"chat_title": "科技新闻 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "7b1268de-69b6-47fa-a109-09c389efc4e8",
				"fk_channel_id": "441858b0-8b69-417c-91bb-179634842048",
				"chat_title": "健康建议 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "7ad27a99-6a78-495f-a202-e9e864732b54",
				"fk_channel_id": "441858b0-8b69-417c-91bb-179634842048",
				"chat_title": "健康建议 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "cb56a1af-f3ad-44ad-9874-3dc5d402af3e",
				"fk_channel_id": "441858b0-8b69-417c-91bb-179634842048",
				"chat_title": "健康建议 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "552b7947-24eb-427e-bccf-0079ca40fbce",
				"fk_channel_id": "441858b0-8b69-417c-91bb-179634842048",
				"chat_title": "健康建议 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "3b67fb4a-5810-4efa-be85-3e22f12eb602",
				"fk_channel_id": "c1bdd3e1-e228-4500-93f9-345d15f23e81",
				"chat_title": "烹饪食谱 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "a48cb09e-bb65-4249-b693-f1d86fed3e57",
				"fk_channel_id": "c1bdd3e1-e228-4500-93f9-345d15f23e81",
				"chat_title": "烹饪食谱 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "19e706ce-c862-4114-b08f-154e87733776",
				"fk_channel_id": "c1bdd3e1-e228-4500-93f9-345d15f23e81",
				"chat_title": "烹饪食谱 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "e7a2a029-5788-42f5-9eaf-3f4095908c80",
				"fk_channel_id": "c1bdd3e1-e228-4500-93f9-345d15f23e81",
				"chat_title": "烹饪食谱 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "8dad6d13-111e-4a2a-a319-b6dc50f45617",
				"fk_channel_id": "27d83f51-71a6-4f9b-a896-184ce81bd996",
				"chat_title": "旅行指南 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "92885a2b-7a9d-470e-a979-6f3c8907cdad",
				"fk_channel_id": "27d83f51-71a6-4f9b-a896-184ce81bd996",
				"chat_title": "旅行指南 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "49611959-518a-4005-af9f-19b3d8738de0",
				"fk_channel_id": "27d83f51-71a6-4f9b-a896-184ce81bd996",
				"chat_title": "旅行指南 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "d61b0ce1-4346-4591-887a-742d139fdff4",
				"fk_channel_id": "27d83f51-71a6-4f9b-a896-184ce81bd996",
				"chat_title": "旅行指南 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "417cefab-dc10-46da-ad0a-2c6c59e8814e",
				"fk_channel_id": "05b63f4c-86a7-49f2-aa4e-dc7d30233f85",
				"chat_title": "金融知识 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "06ecbc43-8311-4257-be27-b68a7650226c",
				"fk_channel_id": "05b63f4c-86a7-49f2-aa4e-dc7d30233f85",
				"chat_title": "金融知识 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "89fc2286-e5d9-4272-99af-6a37a3de32d4",
				"fk_channel_id": "05b63f4c-86a7-49f2-aa4e-dc7d30233f85",
				"chat_title": "金融知识 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "5a976db2-5243-4762-8016-89f7cb46e8fe",
				"fk_channel_id": "05b63f4c-86a7-49f2-aa4e-dc7d30233f85",
				"chat_title": "金融知识 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "6b48c6e1-de40-4245-b7e9-b6f4da873601",
				"fk_channel_id": "3e793997-1d1d-408c-9b50-c86c7b909424",
				"chat_title": "文学分析 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "d48a8b6d-247d-49f2-9e04-e768582886be",
				"fk_channel_id": "3e793997-1d1d-408c-9b50-c86c7b909424",
				"chat_title": "文学分析 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "d8b5e48d-b49a-46fa-a06d-04e369f0d49c",
				"fk_channel_id": "3e793997-1d1d-408c-9b50-c86c7b909424",
				"chat_title": "文学分析 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "4da1c906-a704-44dd-b610-5ac58a66577d",
				"fk_channel_id": "2af8dbe0-75db-4318-a762-94937dd0a4c0",
				"chat_title": "环境保护 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "ad61b463-1852-4314-be75-081be81239cb",
				"fk_channel_id": "2af8dbe0-75db-4318-a762-94937dd0a4c0",
				"chat_title": "环境保护 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "62496aee-e369-494a-9c13-7b1c8f09aac6",
				"fk_channel_id": "2af8dbe0-75db-4318-a762-94937dd0a4c0",
				"chat_title": "环境保护 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "99a651c5-b563-4f87-8ac7-4831085c3fad",
				"fk_channel_id": "c49eadc8-b06b-4b8a-ae58-d7d2c85effda",
				"chat_title": "体育新闻 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "201dd357-5185-4716-8209-72e130f35fc3",
				"fk_channel_id": "c49eadc8-b06b-4b8a-ae58-d7d2c85effda",
				"chat_title": "体育新闻 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "5f0c8bf9-f41f-4934-90ad-70858d9de90a",
				"fk_channel_id": "c49eadc8-b06b-4b8a-ae58-d7d2c85effda",
				"chat_title": "体育新闻 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "ebb9b36a-f154-49a2-bd03-0c8039d61b32",
				"fk_channel_id": "302a8f32-773d-460e-af0d-7c6866f183d1",
				"chat_title": "电影推荐 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "a722a973-6040-4f65-bb9e-a05f74b92f26",
				"fk_channel_id": "302a8f32-773d-460e-af0d-7c6866f183d1",
				"chat_title": "电影推荐 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "7d342393-da31-4920-a348-3ae2ba3c0089",
				"fk_channel_id": "302a8f32-773d-460e-af0d-7c6866f183d1",
				"chat_title": "电影推荐 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "b5549099-6b45-4e1e-a75c-2e774a7912c5",
				"fk_channel_id": "302a8f32-773d-460e-af0d-7c6866f183d1",
				"chat_title": "电影推荐 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "a8c2c5e8-1d41-4357-addf-e7c550b5dba9",
				"fk_channel_id": "27692a88-5876-478c-9427-7b30e2386756",
				"chat_title": "音乐欣赏 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "d03bd952-912b-4fca-8a05-c5042b5d449f",
				"fk_channel_id": "27692a88-5876-478c-9427-7b30e2386756",
				"chat_title": "音乐欣赏 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "122ff748-e0da-4d7e-b0a4-7f40debf63f2",
				"fk_channel_id": "27692a88-5876-478c-9427-7b30e2386756",
				"chat_title": "音乐欣赏 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "335ccf80-1930-4742-ae16-054a8d4f9d5f",
				"fk_channel_id": "27692a88-5876-478c-9427-7b30e2386756",
				"chat_title": "音乐欣赏 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "04e2c115-0070-4688-a94a-072ef7c9f32c",
				"fk_channel_id": "19bcbe55-06be-458b-80df-e289d814c351",
				"chat_title": "艺术历史 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "3efbcfd2-8b84-43e9-a734-9c4c029a719d",
				"fk_channel_id": "19bcbe55-06be-458b-80df-e289d814c351",
				"chat_title": "艺术历史 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "8fbeb2ef-2c28-4216-8324-c333cabc0e6d",
				"fk_channel_id": "19bcbe55-06be-458b-80df-e289d814c351",
				"chat_title": "艺术历史 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "5c367782-cb4d-45f1-ac7c-6271648f4bfc",
				"fk_channel_id": "19bcbe55-06be-458b-80df-e289d814c351",
				"chat_title": "艺术历史 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "39611e40-c1e8-4b09-b456-402d373f7ac4",
				"fk_channel_id": "aec2965a-c022-4c5c-8f3e-5b50a3a366b6",
				"chat_title": "心理学知识 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "b661ffe7-2433-4c17-bc2c-d03f3d02fb09",
				"fk_channel_id": "aec2965a-c022-4c5c-8f3e-5b50a3a366b6",
				"chat_title": "心理学知识 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "aa438e61-fead-49a9-9430-ccd1c03f97eb",
				"fk_channel_id": "aec2965a-c022-4c5c-8f3e-5b50a3a366b6",
				"chat_title": "心理学知识 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "f8415745-b866-4f10-b0e6-d5dd7d4a8a0b",
				"fk_channel_id": "aec2965a-c022-4c5c-8f3e-5b50a3a366b6",
				"chat_title": "心理学知识 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "e4767a4d-3d51-48e8-943c-dfb6b4c93d36",
				"fk_channel_id": "b4cd2322-5c5b-4fe2-a585-6a3d3678ea2f",
				"chat_title": "哲学思考 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "2e848ed5-82ce-4a66-8cb5-8e0f2d5f333f",
				"fk_channel_id": "b4cd2322-5c5b-4fe2-a585-6a3d3678ea2f",
				"chat_title": "哲学思考 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "ed1051ef-b19a-4f31-9ec7-d9f70132f221",
				"fk_channel_id": "b4cd2322-5c5b-4fe2-a585-6a3d3678ea2f",
				"chat_title": "哲学思考 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "573b1061-fbb4-4c47-9294-38aa687f7bab",
				"fk_channel_id": "c813dd91-8be3-4b20-b849-4b2356dbf59d",
				"chat_title": "语言学习 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "b16f04ca-520b-4be5-a7e6-bdedf25448d6",
				"fk_channel_id": "c813dd91-8be3-4b20-b849-4b2356dbf59d",
				"chat_title": "语言学习 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "48f83549-0fc4-43c6-bc43-b89ea9224d39",
				"fk_channel_id": "c813dd91-8be3-4b20-b849-4b2356dbf59d",
				"chat_title": "语言学习 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "78c0948a-f533-4a58-9d38-ad35c527e6a7",
				"fk_channel_id": "c813dd91-8be3-4b20-b849-4b2356dbf59d",
				"chat_title": "语言学习 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "25ba6185-7bbd-402a-9031-479345b61cb8",
				"fk_channel_id": "fbb6e71e-30db-4fbd-80a3-a0e524da716d",
				"chat_title": "园艺技巧 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "fdf56bee-6e59-4c25-8f10-a1424bedc52b",
				"fk_channel_id": "fbb6e71e-30db-4fbd-80a3-a0e524da716d",
				"chat_title": "园艺技巧 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "6361d478-0f97-4b8d-838e-28424a40624a",
				"fk_channel_id": "fbb6e71e-30db-4fbd-80a3-a0e524da716d",
				"chat_title": "园艺技巧 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "9ee51183-f540-4e03-8ac1-ed9fbf3e55c5",
				"fk_channel_id": "fbb6e71e-30db-4fbd-80a3-a0e524da716d",
				"chat_title": "园艺技巧 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "33175257-f0b5-4c66-8eca-0d60c7fad000",
				"fk_channel_id": "bce9b669-810f-40e0-a2e9-641a908be4c6",
				"chat_title": "汽车保养 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "e521ef1d-7f74-4d40-81d7-852f9b4d951d",
				"fk_channel_id": "bce9b669-810f-40e0-a2e9-641a908be4c6",
				"chat_title": "汽车保养 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "d73d8bc9-b093-4659-8b98-71bda4d0aaab",
				"fk_channel_id": "bce9b669-810f-40e0-a2e9-641a908be4c6",
				"chat_title": "汽车保养 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "ac3e2fd2-7b9b-469b-974c-41b1d8bab18e",
				"fk_channel_id": "e78af7ea-1f13-4c71-8461-cd7c473f4a41",
				"chat_title": "时尚趋势 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "e8433631-c0d3-4b9c-906d-7f85ca821594",
				"fk_channel_id": "e78af7ea-1f13-4c71-8461-cd7c473f4a41",
				"chat_title": "时尚趋势 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "11f5ba0c-16a7-4e34-a971-00a37694aa13",
				"fk_channel_id": "e78af7ea-1f13-4c71-8461-cd7c473f4a41",
				"chat_title": "时尚趋势 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "7315d259-1914-46a2-b59e-176fe4ab2759",
				"fk_channel_id": "18034561-2495-4376-9851-f580342fbcdf",
				"chat_title": "游戏攻略 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "2ca5f5ab-645d-4bde-b672-cd35af50cc1a",
				"fk_channel_id": "18034561-2495-4376-9851-f580342fbcdf",
				"chat_title": "游戏攻略 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "c079f029-2875-44b4-b4a5-334d62cf8cd6",
				"fk_channel_id": "18034561-2495-4376-9851-f580342fbcdf",
				"chat_title": "游戏攻略 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "d3062c76-2e21-44f8-9831-88b38e0d6a32",
				"fk_channel_id": "7b0cfe82-53ac-4cd3-8b09-885c219e8255",
				"chat_title": "宠物护理 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "96eed927-3f76-4a64-86a4-523eda8135b9",
				"fk_channel_id": "7b0cfe82-53ac-4cd3-8b09-885c219e8255",
				"chat_title": "宠物护理 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "02c59c49-5b02-4b59-bb07-f046106f6446",
				"fk_channel_id": "7b0cfe82-53ac-4cd3-8b09-885c219e8255",
				"chat_title": "宠物护理 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "89f382a3-ee3c-4108-a65a-396ba5ef0862",
				"fk_channel_id": "b8e6977b-dcc0-48d8-be35-5714f6dc76dc",
				"chat_title": "营养饮食 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "10a216d8-89c0-4df1-81cb-cb38f493d7da",
				"fk_channel_id": "b8e6977b-dcc0-48d8-be35-5714f6dc76dc",
				"chat_title": "营养饮食 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "77144a45-6864-4942-a254-345004bbc85f",
				"fk_channel_id": "b8e6977b-dcc0-48d8-be35-5714f6dc76dc",
				"chat_title": "营养饮食 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "6a75d350-6694-4839-bed5-b106bf11915d",
				"fk_channel_id": "b8e6977b-dcc0-48d8-be35-5714f6dc76dc",
				"chat_title": "营养饮食 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "b04bcbf2-a53d-43f9-a161-799aa03041de",
				"fk_channel_id": "69a81e0c-4176-4cd4-bcc8-ce321c374126",
				"chat_title": "健身训练 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "f92cf5de-2da5-42e7-b18b-ac14d55738dd",
				"fk_channel_id": "69a81e0c-4176-4cd4-bcc8-ce321c374126",
				"chat_title": "健身训练 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "8557b1d7-f9ab-4fac-8074-e084c54d7896",
				"fk_channel_id": "69a81e0c-4176-4cd4-bcc8-ce321c374126",
				"chat_title": "健身训练 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "9b716913-0527-4a42-91a8-9eeac04d7c0a",
				"fk_channel_id": "69a81e0c-4176-4cd4-bcc8-ce321c374126",
				"chat_title": "健身训练 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "890e2635-f1ad-4ebb-9f4c-ac3b0c9a9499",
				"fk_channel_id": "0abab023-3664-4698-957d-f4834c09a03f",
				"chat_title": "摄影技巧 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "c53ef9f9-3e83-4b70-8440-045ff212c8a2",
				"fk_channel_id": "0abab023-3664-4698-957d-f4834c09a03f",
				"chat_title": "摄影技巧 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "260c1bda-e843-40e0-904e-e52786e926da",
				"fk_channel_id": "0abab023-3664-4698-957d-f4834c09a03f",
				"chat_title": "摄影技巧 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "57427c11-1e43-45ec-b3b8-2514be279a92",
				"fk_channel_id": "ae93039f-011d-41f0-82fd-2572a2bf1250",
				"chat_title": "天文学 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "94b8b1ff-2e28-41ef-acd0-aa5a8daf5256",
				"fk_channel_id": "ae93039f-011d-41f0-82fd-2572a2bf1250",
				"chat_title": "天文学 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "5c0c86a4-fb77-4b98-beee-1b80042d79b4",
				"fk_channel_id": "ae93039f-011d-41f0-82fd-2572a2bf1250",
				"chat_title": "天文学 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "4c5ceac4-313c-4232-af4e-d8a04aeae811",
				"fk_channel_id": "8f8d30d7-f359-44bb-b279-5c826a593d9d",
				"chat_title": "地理探索 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "9d959c0b-592e-4ea2-a1f8-467f52ba22d4",
				"fk_channel_id": "8f8d30d7-f359-44bb-b279-5c826a593d9d",
				"chat_title": "地理探索 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "8b5dce44-1606-4366-b65f-ad62807c1228",
				"fk_channel_id": "8f8d30d7-f359-44bb-b279-5c826a593d9d",
				"chat_title": "地理探索 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "c0abc4c8-06ac-47b7-87f1-925302ebbd03",
				"fk_channel_id": "8f8d30d7-f359-44bb-b279-5c826a593d9d",
				"chat_title": "地理探索 对话 4",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "8fa3a74b-ed55-467c-8b3b-23f30d1cff93",
				"fk_channel_id": "3bb035d8-d6f2-4a03-a8a0-955196f291bc",
				"chat_title": "经济理论 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "110655ce-4662-49ca-815e-69de5f37fd77",
				"fk_channel_id": "3bb035d8-d6f2-4a03-a8a0-955196f291bc",
				"chat_title": "经济理论 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "eba6e865-f575-4a5a-b153-2341e0e3b246",
				"fk_channel_id": "3bb035d8-d6f2-4a03-a8a0-955196f291bc",
				"chat_title": "经济理论 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "a6089b5e-31fd-429e-83ac-6f400da84ec0",
				"fk_channel_id": "adec38a6-e6a5-403a-bff1-8c93a65d6bbc",
				"chat_title": "社会学 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "faede250-fb1d-42e6-b6cd-d1bb67de7b85",
				"fk_channel_id": "adec38a6-e6a5-403a-bff1-8c93a65d6bbc",
				"chat_title": "社会学 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "c76b402b-a08c-4150-bbaa-2c982e6efbf0",
				"fk_channel_id": "adec38a6-e6a5-403a-bff1-8c93a65d6bbc",
				"chat_title": "社会学 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "e5b70880-a076-4c94-b9d0-6907c4108c78",
				"fk_channel_id": "bed99217-d70f-4c2d-833d-64650257c801",
				"chat_title": "生物科学 对话 1",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "43baa4e6-9f21-4e08-b273-d9deb0a50947",
				"fk_channel_id": "bed99217-d70f-4c2d-833d-64650257c801",
				"chat_title": "生物科学 对话 2",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "e206e423-08f5-4c8d-a348-27a2484e61db",
				"fk_channel_id": "bed99217-d70f-4c2d-833d-64650257c801",
				"chat_title": "生物科学 对话 3",
				"is_free_chat": false,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "c7a9d3e2-4f5b-4a3c-9b2d-1e2f3d4e5f6g",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 1",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "d8b0e4f3-5g6c-4b4d-a0c3-2f3e4d5f6g7h",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 2",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "e9c1f5g4-6h7d-4c5e-b1d4-3g4f5e6h7i8j",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 3",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "f0d2g6h5-7i8e-4d6f-c2e5-4h5g6i7j8k9l",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 4",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "g1e3h7i6-8j9f-4e7g-d3f6-5i6h7j8k9l0m",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 5",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "h2f4i8j7-9k0g-4f8h-e4g7-6j7i8k9l0m1n",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 6",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "i3g5j9k8-0l1h-4g9i-f5h8-7k8j9l0m1n2o",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 7",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "j4h6k0l9-1m2i-4h0j-g6i9-8l9k0m1n2o3p",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 8",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "k5i7l1m0-2n3j-4i1k-h7j0-9m0l1n2o3p4q",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 9",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "l6j8m2n1-3o4k-4j2l-i8k1-0n1m2o3p4q5r",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 10",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "m7k9n3o2-4p5l-4k3m-j9l2-1o2n3p4q5r6s",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 11",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "n8l0o4p3-5q6m-4l4n-k0m3-2p3o4q5r6s7t",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 12",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "o9m1p5q4-6r7n-4m5o-l1n4-3q4p5r6s7t8u",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 13",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "p0n2q6r5-7s8o-4n6p-m2o5-4r5q6s7t8u9v",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 14",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			},
			{
				"chat_id": "q1o3r7s6-8t9p-4o7q-n3p6-5s6r7t8u9v0w",
				"fk_channel_id": "Free_Chat_Symbol.description",
				"chat_title": "日常闲聊 15",
				"is_free_chat": true,
				"disable_turn_context": false,
				"created_at": 1723843200000
			}
		] as const as Chat[] ,
		"channels" : [
			{
				"channel_id" : "4b6523c8-8d8a-46a5-be0d-de100e15fe36" ,
				"channel_title" : "英语学习" ,
				"systemPrompt" : "将中文翻译为英语" ,
				"created_at" : 1755109632387 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "86b21ccd-6b42-46f1-920c-1c35f28db464" ,
				"channel_title" : "医学知识" ,
				"systemPrompt" : "将中文翻译为英语" ,
				"created_at" : 1755109632387 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "8f7df1ce-3062-4b41-87fe-8f148f39d397" ,
				"channel_title" : "数学问题" ,
				"systemPrompt" : "解答数学相关问题" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "988d3983-46ba-4d60-a1f7-9f76442d0fb3" ,
				"channel_title" : "编程帮助" ,
				"systemPrompt" : "提供编程代码示例" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "449c6434-c5a4-4772-b42e-a12a5f9919ed" ,
				"channel_title" : "历史事件" ,
				"systemPrompt" : "讨论历史事件" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "8d71517b-b4b0-44a2-bda7-0d803434b5ba" ,
				"channel_title" : "科技新闻" ,
				"systemPrompt" : "总结最新科技新闻" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "441858b0-8b69-417c-91bb-179634842048" ,
				"channel_title" : "健康建议" ,
				"systemPrompt" : "给出健康生活建议" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "c1bdd3e1-e228-4500-93f9-345d15f23e81" ,
				"channel_title" : "烹饪食谱" ,
				"systemPrompt" : "分享简单食谱" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "27d83f51-71a6-4f9b-a896-184ce81bd996" ,
				"channel_title" : "旅行指南" ,
				"systemPrompt" : "推荐旅行目的地" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "05b63f4c-86a7-49f2-aa4e-dc7d30233f85" ,
				"channel_title" : "金融知识" ,
				"systemPrompt" : "解释金融概念" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "3e793997-1d1d-408c-9b50-c86c7b909424" ,
				"channel_title" : "文学分析" ,
				"systemPrompt" : "分析文学作品" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "2af8dbe0-75db-4318-a762-94937dd0a4c0" ,
				"channel_title" : "环境保护" ,
				"systemPrompt" : "讨论环保话题" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "c49eadc8-b06b-4b8a-ae58-d7d2c85effda" ,
				"channel_title" : "体育新闻" ,
				"systemPrompt" : "更新体育赛事" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "302a8f32-773d-460e-af0d-7c6866f183d1" ,
				"channel_title" : "电影推荐" ,
				"systemPrompt" : "推荐电影" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "27692a88-5876-478c-9427-7b30e2386756" ,
				"channel_title" : "音乐欣赏" ,
				"systemPrompt" : "介绍音乐艺术家" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "19bcbe55-06be-458b-80df-e289d814c351" ,
				"channel_title" : "艺术历史" ,
				"systemPrompt" : "讲解艺术历史" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "aec2965a-c022-4c5c-8f3e-5b50a3a366b6" ,
				"channel_title" : "心理学知识" ,
				"systemPrompt" : "解释心理学原理" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "b4cd2322-5c5b-4fe2-a585-6a3d3678ea2f" ,
				"channel_title" : "哲学思考" ,
				"systemPrompt" : "探讨哲学问题" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "c813dd91-8be3-4b20-b849-4b2356dbf59d" ,
				"channel_title" : "语言学习" ,
				"systemPrompt" : "帮助学习新语言" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "fbb6e71e-30db-4fbd-80a3-a0e524da716d" ,
				"channel_title" : "园艺技巧" ,
				"systemPrompt" : "分享园艺tips" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "bce9b669-810f-40e0-a2e9-641a908be4c6" ,
				"channel_title" : "汽车保养" ,
				"systemPrompt" : "汽车维护建议" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "e78af7ea-1f13-4c71-8461-cd7c473f4a41" ,
				"channel_title" : "时尚趋势" ,
				"systemPrompt" : "讨论时尚" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "18034561-2495-4376-9851-f580342fbcdf" ,
				"channel_title" : "游戏攻略" ,
				"systemPrompt" : "提供游戏攻略" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "7b0cfe82-53ac-4cd3-8b09-885c219e8255" ,
				"channel_title" : "宠物护理" ,
				"systemPrompt" : "宠物护理指南" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "b8e6977b-dcc0-48d8-be35-5714f6dc76dc" ,
				"channel_title" : "营养饮食" ,
				"systemPrompt" : "营养饮食建议" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "69a81e0c-4176-4cd4-bcc8-ce321c374126" ,
				"channel_title" : "健身训练" ,
				"systemPrompt" : "健身计划" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "0abab023-3664-4698-957d-f4834c09a03f" ,
				"channel_title" : "摄影技巧" ,
				"systemPrompt" : "摄影技巧" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "ae93039f-011d-41f0-82fd-2572a2bf1250" ,
				"channel_title" : "天文学" ,
				"systemPrompt" : "天文知识" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "8f8d30d7-f359-44bb-b279-5c826a593d9d" ,
				"channel_title" : "地理探索" ,
				"systemPrompt" : "地理事实" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "3bb035d8-d6f2-4a03-a8a0-955196f291bc" ,
				"channel_title" : "经济理论" ,
				"systemPrompt" : "经济概念" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "adec38a6-e6a5-403a-bff1-8c93a65d6bbc" ,
				"channel_title" : "社会学" ,
				"systemPrompt" : "社会学话题" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			} ,
			{
				"channel_id" : "bed99217-d70f-4c2d-833d-64650257c801" ,
				"channel_title" : "生物科学" ,
				"systemPrompt" : "生物知识" ,
				"created_at" : 1723843200000 ,
				"archived" : false,
			},
		] as Channel[] ,
		//当前所选中的chat
		current_chat_id : null as string,
		search_input_text : null,
	} );
	
	if(IPC){
		var wsPromise = import('#renderer/WindowFrames/shared/reaxels/messages-subscriber').then(({wsOn,wsSend}) => ({wsOn,wsSend}));
		wsPromise.then(({wsOn,wsSend}) => {
			wsOn('messages-updated' , async( data , code ) => {
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
			
			wsOn('channels-updated', async (data) => {
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
			
			wsOn('chats-updated', async (data) => {
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
		})
	}
	
	const newFreeChat = (props:{
		
	}) => {
		wsPromise.then(({wsSend}) => {
			const { textArea_UserInputChatText } = reaxel_UserChatInput.store;
			wsSend('new-chat',{
				chat_temp_id : uuidv4(),
				inputs:[{
					type:'text',
					text: textArea_UserInputChatText,
				}],
				model : 'gpt-5-nano'
			},1000);
		})
	}
	
	const rtn = {
		setCurrentChat(chat_id:string){
			setState({current_chat_id : chat_id});
		},
		newFreeChat,
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
