import { useChat } from "#Main-Chat/rc/Chat/useChat";

export const ChatView = reaxper( () => {
	const {chat_id} = useParams();
	useEffect( () => {
		if( chat_id ) {
			reaxel_Chats.setState({current_chat_id : chat_id});
		}
	} , [] );
	return <div className = { less.mainChat }>
		<StickyHeader />
		<ChatThreadContainer />
		<UserInputArea />
	</div>;
	
} );

import { Home } from '#Main-Chat/rc/Home';
import {
	useOutlet ,
	useParams,
} from 'react-router-dom';
import { StickyHeader } from '#Main-Chat/rc/Chat/Sticky-Header';
import { UserInputArea } from '#Main-Chat/rc/Chat/User-Input-Area';
import { ChatThreadContainer } from '#Main-Chat/rc/Chat/Chat-Thread-Container';
import less from './index.module.less';
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
