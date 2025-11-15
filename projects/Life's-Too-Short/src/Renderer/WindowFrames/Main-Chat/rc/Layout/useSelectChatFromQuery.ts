
export const useSelectChatFromQuery = () => {
	const { setExpandChannels } = reaxel_UI();
	const {chat_id,chat} = useChat();
	
	useEffect(() => {
		reaxel_Chats.setState( { current_chat_id : chat_id ? chat_id : null } );
		//当路由中有chat_id且非free-chat的时候,将chat所在的channel展开
		if(chat_id && chat && !chat?.is_free_chat){
			
			setExpandChannels(chat.fk_channel_id ? [chat.fk_channel_id,...reaxel_UI.store.expanded_channels.user_channels] : []);
		}
	},[chat_id,chat?.fk_channel_id]);
	
}

import { reaxel_UI } from "#Main-Chat/reaxels/UI";
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import { useChat } from "#Main-Chat/rc/Chat/useChat";
