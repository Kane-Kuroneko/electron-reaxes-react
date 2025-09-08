const { TextArea } = Input;
/**
 * Alias:NewChat
 */
export const Home = reaxper( () => {
	
	const {
		store ,
		setState,
	} = useReaxable( {
		options_expand : false ,
	} );
	
	const {deletePreset,modifyPreset} = reaxel_QuickPrompts();
	
	return <div
		className={ less.home }
	>
		<div
			style={ {
				display : "flex" ,
				width : '100%' ,
			} }
		>
			<CreateBar />
		</div>
		<div className="user-input-container">
			<Button
				onClick={ () => {
					setState( { options_expand : !store.options_expand } );
				} }
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
					<div
						style={{
							gap: '8px',
							display : 'flex',
							flexWrap:'wrap'
						}}
					>
						{ reaxel_QuickPrompts.store.presets.map( ( {
							id ,
							title ,
							content ,
						} ) =>
							<QuickPromptPreset
								key={id}
								preset={ {
									preset_prompt_id : id ,
									title ,
									content ,
								} }
								onEdit={ ( preset ) => {
									modifyPreset(preset.preset_prompt_id,{
										content : preset.content ,
										title : preset.title ,
									})
									// console.log( 'Edited preset:' , preset );
								} }
								onDelete={(preset_prompt_id) => {
									deletePreset(preset_prompt_id);
								}}
							/> 
						) }
						
					</div>
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

import {
	Boxies ,
	CreateBar,
} from "#Main-Chat/rc/Home/Boxies";
import {
	Button ,
	Input ,
	Select ,
	Form ,
} from 'antd';
import less from './index.module.less';
import { UserInputArea } from "#Main-Chat/rc/Chat/User-Input-Area";
import { QuickPromptPreset } from "#renderer/WindowFrames/shared/rc/QuickPromptPreset";
import { reaxel_QuickPrompts } from "#renderer/WindowFrames/shared/reaxels/quick-prompts";
import { reaxel_UserChatInput } from "#Main-Chat/reaxels/user-chat-input";
