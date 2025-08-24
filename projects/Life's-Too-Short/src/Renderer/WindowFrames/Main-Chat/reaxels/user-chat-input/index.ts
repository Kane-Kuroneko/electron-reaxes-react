import { wsSend } from "#renderer/WindowFrames/shared/reaxels/messages-subscriber";

export const reaxel_UserChatInput = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate ,
	} = createReaxable( {
		textArea_UserInputChatText : '今天是什么日子' ,
		select_UserSelectedLLM : 'gpt-5' ,
		select_UserSelectedLanguage : 'zh_CN' as Languages,
		
		prompts : {
			prompt_contents : [],
			disabled_custom_prompts : false,
			
		},
		
	} );
	
	const talkToLLM = async() => {
		wsSend( 'new-chat',{
			model : 'gpt-5-nano' ,
			inputs : [
				{
					type:'text',
					text : store.textArea_UserInputChatText,
				},
			] ,
			chat_temp_id:uuidv4()
		} ,1000)
		
	};
	
	const rtn = {
		talkToLLM,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

import {
	IpcRendererInvoke ,
	IpcRendererSend ,
	IpcRendererOn,
} from '#renderer/utils/useIPC';
import { Languages } from "#root/generic-services/refaxels/i18n";
import { v4 as uuidv4 } from 'uuid';

