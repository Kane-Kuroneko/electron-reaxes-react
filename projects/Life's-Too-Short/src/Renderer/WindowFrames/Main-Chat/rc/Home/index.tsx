import { reaxel_UserChatInput } from "#Main-Chat/reaxels/user-chat-input";

const { TextArea } = Input;
/**
 * Alias:NewChat
 */
export const Home = reaxper( () => {
	
	const {store,setState} = useReaxable({
		options_expand : false,
	})
	
	return <div
		className={ less.home }
	>
		<div style={{
			display : "flex",
			width : '100%',
		}}>
			<CreateBar/>
		</div>
		<div className="user-input-container">
			<Button
				onClick={() => {
					setState({options_expand : !store.options_expand});
				}}
			>
				更多
			</Button>
			<div>
				<div>
					<Form.Item
						label="What can AI do for you?"
						layout="vertical"
					>
						<Input.TextArea
						/>
					</Form.Item>
					<QuickPromptPreset
						preset = {{
							preset_prompt_id : '1' ,
							title : 'Translate to English' ,
							content : 'Please translate the following text to English: ' ,
						}}
						onEdit = { ( preset ) => {
							console.log( 'Edited preset:' , preset );
						} }
					/>
					<Form.Item
						label="What should the AI know about your task?"
						layout="vertical"
					>
						<Input.TextArea
						/>
					</Form.Item>
				</div>
			</div>
			<UserInputArea />
		</div>
	</div>;
} );

import { Boxies , CreateBar } from "#Main-Chat/rc/Home/Boxies";
import {
	Button ,
	Input ,
	Select ,
	Form,
} from 'antd';
import less from './index.module.less';
import { UserInputArea } from "#Main-Chat/rc/Chat/User-Input-Area";
import { QuickPromptPreset } from "#renderer/WindowFrames/shared/rc/QuickPromptPreset";
   
