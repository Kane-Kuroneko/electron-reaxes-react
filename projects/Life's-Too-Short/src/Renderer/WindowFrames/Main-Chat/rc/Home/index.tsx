
const { TextArea } = Input;
/**
 * Alias:NewChat
 */
export const Home = reaxper( () => {
	
	
	return <div
		className={less.home}
	>
		<div>
			<Boxies/>
			
		</div>
		<div className="user-input-container">
			<UserInputArea/>
		</div>
	</div>;
} );

import { Boxies } from "#Main-Chat/rc/Home/Boxies";
import {
	Button ,
	Input ,
	Select,
} from 'antd';
import less from './index.module.less';
import { UserInputArea } from "#Main-Chat/rc/Chat/User-Input-Area";
   
