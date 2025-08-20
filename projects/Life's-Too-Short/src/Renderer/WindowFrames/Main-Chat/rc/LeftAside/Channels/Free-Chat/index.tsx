export const FreeChat = reaxper( () => {
	
	const { setCurrentChat } = reaxel_Chats();
	
	const freeChatItems = reaxel_Chats.store.chats.filter( chat => {
		switch( true ) {
			case !chat.is_free_chat:
				return false;
			default:
				return true;
		}
	} ).map( ( {
		chat_id ,
		chat_title ,
	} ):ItemType => {
		return {
			key : chat_id ,
			title : chat_title ,
			className : "item" ,
			label : <FreeChatItem
				chat_id={chat_id}
				label={chat_title}
			/> ,
		};
	} );
	
	return <div
		className={ less.freeChat }
	>
		
		<Menu
			className="menu"
			theme="light"
			selectedKeys={ [ reaxel_Chats.store.current_chat_id ] }
			mode="inline"
			items={ [
				{
					key : 'free-chat' ,
					label : 'Free Chats' ,
					className : "free-chat-title" ,
					children : [
						{
							key : '$new-chat$' ,
							label : <NewFreeChat /> ,
							onClick(e) {
								console.log( '暂未实现' );
								e.domEvent.stopPropagation();
							} ,
							className : "new-free-chat",
						} as ItemType,
					].concat( freeChatItems ) ,
					
					
				} ,
			] }
			onSelect={ ( si ) => {
				if(si.key === '$new-chat$')return;
				setCurrentChat( si.selectedKeys[0] );
			} }
			defaultOpenKeys={['free-chat']}
		/>
	</div>;
	
} );

import { NewFreeChat } from '#Main-Chat/rc/LeftAside/Channels/Free-Chat/New-Free-Chat';
import { FreeChatItem } from '#Main-Chat/rc/LeftAside/Channels/Free-Chat/Free-Chat-Item';
import { Menu  } from 'antd';
import { ItemType } from 'antd/lib/menu/interface';
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
