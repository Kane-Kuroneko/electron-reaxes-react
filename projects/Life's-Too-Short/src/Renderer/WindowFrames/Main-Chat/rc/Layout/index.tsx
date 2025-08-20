export const Layout = reaxper( () => {
	
	const outlet = useOutlet();
	
	return <div className={ less['layout'] }>
		<LeftSide />
		{ outlet }
		<FloatBottomRight />
		
		<QueryRoute
			queryKey="settings"
			element={<Settings />}
			queryValue={['general']}
		/>
	</div>;
} );

import { useOutlet } from 'react-router-dom';
import { SearchBar } from '#Main-Chat/rc/LeftAside/SearchBar';
import { FloatBottomRight } from '#Main-Chat/rc/Float-Btn-Group/Bottom-Right';
import { LeftSide } from "#Main-Chat/rc/LeftAside";
import type { Message } from '#src/types/Message';
import type { Channel } from '#src/types/Channel';
import type { Chat } from '#src/types/Chat';
import less from './index.module.less';

import { QueryRoute } from '#renderer/WindowFrames/shared/rc/QueryRoute';
import { Settings } from '#Main-Chat/rc/Settings';
import { Home } from "#Main-Chat/rc/Home";
