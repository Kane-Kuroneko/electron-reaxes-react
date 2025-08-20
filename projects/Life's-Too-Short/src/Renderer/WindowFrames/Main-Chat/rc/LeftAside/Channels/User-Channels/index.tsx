
export const UserChannels = reaxper( () => {
	

	
	return <div
		className={ less.userChannels }
	>
		<ChannelHeader/>
		<NewChannel/>
		<ChannelWithContextMenu/>
	</div>;
	
} );
import { ChannelWithContextMenu } from "#Main-Chat/rc/LeftAside/Channels/User-Channels/Channel-With-ContextMenu";
import { NewChannel } from './New-Channel';
import { ChatItem } from '#Main-Chat/rc/LeftAside/Channels/User-Channels/Chat-Item';
import { ChannelHeader } from '#Main-Chat/rc/LeftAside/Channels/User-Channels/Header';
import { Menu  } from 'antd';
import { ItemType } from 'antd/lib/menu/interface';
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
