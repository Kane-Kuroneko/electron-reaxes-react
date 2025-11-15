
const { TextArea } = Input;
export const UserInputArea = reaxper( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = useReaxable( {
		open_model_selector : false ,
	} );
	
	const {
		chat_id ,
		chat,
	} = useChat();
	
	
	const { newChat } = reaxel_UserChatInput();
	
	
	return <div className = { less.userInputArea }>
		
		<div className = "operation-container">
			<div className = "options">
				<ModelPicker/>
				<LanguagePicker/>
			</div>
			
		</div>
		<TextArea
			className = "input-box"
			variant="filled"
			value = { reaxel_UserChatInput.store.textArea_UserInputChatText }
			onChange = { ( e ) => {
				reaxel_UserChatInput.mutate( s => s.textArea_UserInputChatText = e.target.value );
			} }
		/>
		<div className="fire">
			<Button
				disabled={ !!chat && ['requesting','triaging','responding.streaming','responding'].includes(chat.turn_state) }
				type = "default"
				variant="dashed"
				onClick={() => newChat()}
				style={{
					fontWeight:'bold'
				}}
			>Send</Button>
		</div>
	</div>;
} );

import { useChat } from "#Main-Chat/rc/Chat/useChat";
import { reaxel_UserChatInput } from '#Main-Chat/reaxels/user-chat-input';
import {
	Button ,
	Input ,
} from 'antd';
import less from './index.module.less';
import { LanguagePicker } from "#Main-Chat/rc/Chat/User-Input-Area/Chat-Options/Language-Picker";
import { ModelPicker } from "#Main-Chat/rc/Chat/User-Input-Area/Chat-Options/Model-Picker";
