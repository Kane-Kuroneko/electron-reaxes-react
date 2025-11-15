import { useChat } from "#Main-Chat/rc/Chat/useChat";


export const SearchResult = reaxper( () => {
	
	const { chat_id } = useChat();
	
	const {search_text,scope} = reaxel_Chats.store.search;
	
	const chatItems: ItemType[] = reaxel_Chats.store.chats.filter( chat => {
		switch( scope ) {
			case 'all' :
			case null :
			case undefined :
				return search( search_text , chat );
			case 'free-chats' :
				if( chat.is_free_chat )
					return search( search_text , chat );
				else return false;
			case 'all-channels' :
				if( !chat.is_free_chat )
					return search( search_text , chat );
		}
		
		if( typeof scope === 'string' && scope.startsWith( 'channelid_' ) ) {
			if( chat.fk_channel_id === scope ) {
				return search( search_text , chat );
			}
		}
		return false;
	} ).map( chat => (
		{
			key : chat.chat_id ,
			label : chat.chat_title ,
			onClick() {
				stealthNavigate( nav => {
					nav( `/chat/${ chat.chat_id }` );
				} );
			},
		}
	) );
	
	return <div className={ less['search-result'] }>
		<center>Results:</center>
		<Menu
			items={ chatItems }
			selectedKeys={[ chat_id ]}
		/>
	</div>;
} );

const search = (text:string,chat:Chat) => {
	return chat.chat_title.includes(text) || chat.children.some( message_id => {
		const message = reaxel_Chats.store.messages.find( m => m.message_id === message_id );
		return message.contents.some( part => part.type === 'text' && part.text.includes( text ) );
	} );
}

import { type ItemType } from 'antd/lib/menu/interface';
import less from './style.module.less';
import { Menu } from 'antd';
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import { Chat } from "#src/types/Chat";
import { OutsideNavigate } from "#renderer/WindowFrames/shared/hooksAPIOutsideComponents/navigate";
import { stealthNavigate } from "#Main-Chat/hook-tunnels/navigate";
