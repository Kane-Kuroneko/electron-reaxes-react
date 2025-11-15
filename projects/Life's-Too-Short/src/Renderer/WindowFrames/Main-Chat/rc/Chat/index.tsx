
export const ChatView = reaxper( () => {

	return <div className = { less.mainChat }>
		<StickyHeader />
		<ChatThreadContainer />
		<div
			style={{
				inset : 'auto 0 0 0',
				width : 'auto',
				position : 'absolute',
				padding : '12px',
				display : 'flex',
				
			}}
		>
			<UserInputArea />
		</div>
	</div>;
	
} );

import { StickyHeader } from '#Main-Chat/rc/Chat/Sticky-Header';
import { UserInputArea } from '#Main-Chat/rc/Chat/User-Input-Area';
import { ChatThreadContainer } from '#Main-Chat/rc/Chat/Chat-Thread-Container';
import less from './index.module.less';
