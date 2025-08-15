export const reaxel_UserChatInput = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate ,
	} = createReaxable( {
		textArea_UserInputChatText : '今天是什么日子' ,
		select_UserSelectLLM : '' ,
		
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
