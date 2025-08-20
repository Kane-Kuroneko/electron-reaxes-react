const { TextArea } = Input;
/**
 * Alias:NewChat
 */
export const Home = reaxper( () => {
	
	
	return <div
		className={less.home}
	>
		<div>
			<Select
				
			>
				<Select.Option value="free-chat">Free Chat</Select.Option>
				<Select.Option value="free-chat">New Channel</Select.Option>
			</Select>
		</div>
	</div>;
} );


import {
	Button ,
	Input ,
	Select,
} from 'antd';
import less from './index.module.less';
   
