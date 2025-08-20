export const SearchBar = reaxper( () => {
	
	return <div className={less.searchBar}>
		<Input
			value={ reaxel_Chats.store.search_input_text }
			onChange={ ( e ) => {
				reaxel_Chats.setState( {
					search_input_text : e.target.value ,
				} );
			} }
			size="large"
			placeholder="Search chats"
			allowClear
		/>
	</div>;
} );

import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import { Input } from 'antd';
import less from './style.module.less';
