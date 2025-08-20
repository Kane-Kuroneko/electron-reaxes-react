export const Logo = reaxper( () => {
	
	return <div className={less.logo}>
		<span className="title">Life's Too Short AI</span>
		<UpdateIcon
			style={ {
				zoom : '0.3' ,
				position : "absolute",
				right : 0,
				top : -48
			} }
		/>
		<AppVersion />
	</div>;
} );


import { Channels } from '#Main-Chat/rc/LeftAside/Channels';
import { SearchBar } from '#Main-Chat/rc/LeftAside/SearchBar';
import { AppVersion } from '#Main-Chat/rc/App-Version';
import { UpdateIcon } from '#Main-Chat/rc/Update-Icon';
import type { Message } from '#src/types/Message';
import type { Channel } from '#src/types/Channel';
import type { Chat } from '#src/types/Chat';
import less from './style.module.less';
