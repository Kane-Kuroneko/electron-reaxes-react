import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";

export const Layout = reaxper( () => {
	
	const outlet = useOutlet();
	const queryChatId = useParams().chat_id;
	
	useEffect(() => {
		if(!queryChatId){
			reaxel_Chats.setState( { current_chat_id : null } );
		}
	},[queryChatId]);
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

import {
	useOutlet ,
	useParams,
} from 'react-router-dom';
import { FloatBottomRight } from '#Main-Chat/rc/Float-Btn-Group/Bottom-Right';
import { LeftSide } from "#Main-Chat/rc/LeftAside";
import less from './index.module.less';

import { QueryRoute } from '#renderer/WindowFrames/shared/rc/QueryRoute';
import { Settings } from '#Main-Chat/rc/Settings';
