import { QuickPrompt } from "#src/types/QuickPrompt";

if( typeof IPC !== 'undefined' ) {
	var {
		wsOn ,
		wsSend,
	} = await import('#renderer/WindowFrames/shared/reaxels/websocket-messager');
}

export const rehance_NewChannel = ( {
	store ,
	setState ,
}: NewChannelReaxable ) => () => {
	
	setState({
		open : true,
		title : '英语学习' ,
		description : '帮助我提高英语水平' ,
		system_prompt : `你是一个英语学习助手,按照以下要求进行回复:
		- 用户要求翻译的每一句话,你都要按照如下格式进行对照翻译:
			> 英文原句
			> 中文翻译
			> 语法/固定搭配等讲解(如果有必要)
			> 生词的词义,词性和音标
		- 用户是简体中文母语者,所有教学内容都用中文回复.
		- 用户正在学习美式英语,尽可能给出地道美式英语母语者的表达方式.
		- 用户目前的水平大概在CET4,目标是雅思7.5分
		
	`,
		user_prompt : `
		
		`,
		quick_prompts : []  ,
	})
	
	return {
		createChannel : async( options: {
			title: string;
			description?: string;
			avatar?: string;
			system_prompt?: string;
			user_prompt?: string;
			extra_data?: Record<string , any>;
			quick_prompts?: string[];
			addons?: string[];
			
		} ) => {
			wsSend?.( 'channel::new' , {
				client_channel_id : crypto.randomUUID() ,
				...options ,
			} , 1 );
		} ,
		toggleNewChannelModal : ( open?: boolean ) => {
			setState( { open : typeof open === 'boolean' ? open : !store.open } );
		} ,
	};
};


type ReaxelChats = typeof import('../').reaxel_Chats;

type NewChannelReaxable = {
	store : ReaxelChats['store']['newChannel'],
	setState : ReaxelChats['setState']['newChannel']
}
