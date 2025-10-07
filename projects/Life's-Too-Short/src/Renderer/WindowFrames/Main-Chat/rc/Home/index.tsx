
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
			<div>
				<div>
					<ConfigProvider
						theme={{
							components: {
								Form : {
									itemMarginBottom:12
								}
							}
						}}
					>
						<Form
							spellCheck={false}
						>
							<Form.Item
								label={ <Title>What should the AI know about your task?</Title> }
								layout="vertical"
							>
								<Input.TextArea
									variant="filled"
								/>
							</Form.Item>
							<Form.Item
								label={ <Title title="预设的提示词块,关闭则不会生效">Quick prompts:</Title> }
								layout="vertical"
							>
								<QuickPresetPromptGroup/>
							</Form.Item>
						</Form>
					</ConfigProvider>
					
					<div style={{marginBottom : 12}}></div>
				</div>
			</div>
			<UserInputArea />
		</div>
		<footer>
			&copy; Life&#39;s Too Short AI Corp. All rights reserved.
		</footer>
	</div>;
} );

const Title = reaxper( ( props: React.PropsWithChildren<{
	title?: string
}> ) => {
	
	return <span
		style={ {
			fontSize : 16 ,
			fontWeight : 500 ,
			fontFamily : 'Inter,sans-serif' ,
		} }
		title={ props.title }
	>
		{ props.children }
	</span>;
} );

import { QuickPresetPromptGroup } from "#renderer/WindowFrames/shared/rc/QuickPromptGroups";
import { CreateBar  } from "#Main-Chat/rc/Home/Boxies";
import {
	ConfigProvider ,
	Form ,
	Input ,
} from 'antd';
import less from './index.module.less';
import { UserInputArea } from "#Main-Chat/rc/Chat/User-Input-Area";
import { reaxel_QuickPrompts } from "#renderer/WindowFrames/shared/reaxels/quick-prompts";
