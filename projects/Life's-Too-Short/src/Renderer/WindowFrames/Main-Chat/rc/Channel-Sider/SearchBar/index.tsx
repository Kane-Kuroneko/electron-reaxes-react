export const SearchBar = reaxper(() => {
	
	
	return <div>
		<Input
			placeholder="Search chats"
			size="large"
			value = {reaxel_Chats.store.search_input_text}
			allowClear
			onChange= {(e) => {
				reaxel_Chats.setState( {
					search_input_text : e.target.value ,
				} );
			}}
		/>
	</div>
})

import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import { Input } from 'antd';
import less from './style.module.less';
