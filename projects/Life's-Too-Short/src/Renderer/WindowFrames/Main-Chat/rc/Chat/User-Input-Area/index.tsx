import { ScrollableSelect } from "#renderer/WindowFrames/shared/rc/ScrollableSelect";

const { TextArea } = Input;
export const UserInputArea = reaxper( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = useReaxable( {
		chat_model_open : false ,
	} );
	
	const { talkToLLM } = reaxel_UserChatInput();
	
	
	return <div className = { less.userInputArea }>
		
		<div className = "operation-container">
			<div className = "options">
				{ true ? <WheeledPicker/> : <ScrollableSelect
					options={ reaxel_UserChatInput.store.chat_models }
					open={ store.chat_model_open }
					value={ reaxel_UserChatInput.store.select_UserSelectedLLM }
					onWheelSelect={ ( selected ) => {
						reaxel_UserChatInput.setState( { select_UserSelectedLLM : selected.value } );
					} }
					onOpenToggle={ ( oepn ) => {
						setState( { chat_model_open : oepn } );
					} }
				/> }
			</div>
			
		</div>
		<TextArea
			className = "input-box"
			value = { reaxel_UserChatInput.store.textArea_UserInputChatText }
			onChange = { ( e ) => {
				reaxel_UserChatInput.mutate( s => s.textArea_UserInputChatText = e.target.value );
			} }
		/>
		<div className="fire">
			<Button
				type = "primary"
				onClick={() => talkToLLM()}
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

import less from './index.module.less';
import { WheeledPicker } from "#renderer/WindowFrames/shared/rc/Wheeled-Picker";
