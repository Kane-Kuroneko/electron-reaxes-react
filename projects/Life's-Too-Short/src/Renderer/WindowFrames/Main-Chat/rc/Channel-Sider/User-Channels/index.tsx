export const UserChannels = reaxper( () => {
	
	const { setCurrentChat } = reaxel_Chats();
	
	const channelItems = reaxel_Chats.store.channels.map((channel):ItemType => {
		return {
			key : channel.channel_id,
			title : channel.channel_title,
			label : channel.channel_title,
			children : reaxel_Chats.store.chats.filter(chat => chat.fk_channel_id === channel.channel_id).map((chat):ItemType => {
				return {
					key : chat.chat_id ,
					title : chat.chat_title ,
					className : "item" ,
					label : <ChatItem
						chat_id={chat.chat_id}
						label={chat.chat_title}
					/> ,
				}
			})
		}
	})
	
	return <div
		className={ less.userChannels }
	>
		<ChannelHeader/>
		<NewChannel/>
		<Menu
			className="menu"
			theme="light"
			selectedKeys={ [ reaxel_Chats.store.current_chat_id ] }
			mode="inline"
			items={ channelItems }
			onSelect={ ( si ) => {
				setCurrentChat( si.selectedKeys[0] );
			} }
			defaultOpenKeys={[]}
		/>
	</div>;
	
} );

import { NewChannel } from './New-Channel';
import { ChatItem } from '#Main-Chat/rc/Channel-Sider/User-Channels/Chat-Item';
import { ChannelHeader } from '#Main-Chat/rc/Channel-Sider/User-Channels/Header';
import { Menu  } from 'antd';
import { ItemType } from 'antd/lib/menu/interface';
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
