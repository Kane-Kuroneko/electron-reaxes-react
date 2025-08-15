export const ChatView = reaxper( () => {
	
	
	return <div className = { less.mainChat }>
		<StickyHeader />
		<ChatThreadContainer />
		<UserInputArea />
	</div>;
	
} );

import { StickyHeader } from '#Main-Chat/rc/Chat/Sticky-Header';
import { UserInputArea } from '#Main-Chat/rc/Chat/User-Input-Area';
import { ChatThreadContainer } from '#Main-Chat/rc/Chat/Chat-Thread-Container';
import { PromptBox } from '#Main-Chat/rc/Chat/Prompt-Box';
import less from './index.module.less';
