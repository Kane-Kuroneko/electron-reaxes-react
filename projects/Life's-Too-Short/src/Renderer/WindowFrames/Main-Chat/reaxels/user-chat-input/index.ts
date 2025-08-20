export const reaxel_UserChatInput = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate ,
	} = createReaxable( {
		textArea_UserInputChatText : '今天是什么日子' ,
		select_UserSelectedLLM : 'gpt-5' ,
		
		chat_models : [
			{
				value : 'gpt-4o' ,
				label : 'GPT-4o' ,
			} ,
			{
				value : 'gpt-5' ,
				label : 'GPT-5' ,
			} ,
			{
				value : 'gpt-4.1mini' ,
				label : 'GPT-4.1-mini' ,
			} ,
		],
		
		current_chat_id : null,
		prompts : {
			prompt_contents : [],
			disabled_custom_prompts : false,
			
		},
		
	} );
	
	const talkToLLM = async() => {
		IpcRendererInvoke( 'llm-chat' ).invoke( {
			model : 'gpt-5-nano' ,
			input : [
				{
					role : 'user' ,
					content : store.textArea_UserInputChatText,
					message_id : ''
				},
			] ,
			
		} ).then( ( res ) => {
			console.log( res );
		} ).catch( e => {
			console.error( e );
		} );
		
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
