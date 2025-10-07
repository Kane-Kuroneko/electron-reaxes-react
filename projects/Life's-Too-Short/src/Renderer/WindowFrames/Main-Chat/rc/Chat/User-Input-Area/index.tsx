import { useChat } from "#Main-Chat/rc/Chat/useChat";

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

import { reaxel_UserChatInput } from '#Main-Chat/reaxels/user-chat-input';
import {
	Input ,
	Button ,
	Select ,
} from 'antd';
import { LLMModels } from '#src/shared/LLM-Models';
import { ScrollableSelect } from "#renderer/WindowFrames/shared/rc/ScrollableSelect";
import less from './index.module.less';
import { WheeledPicker } from "#renderer/WindowFrames/shared/rc/Wheeled-Picker";
import { LanguagePicker } from "#Main-Chat/rc/Chat/User-Input-Area/Chat-Options/Language-Picker";
import { ModelPicker } from "#Main-Chat/rc/Chat/User-Input-Area/Chat-Options/Model-Picker";
