export const useChat = () => {
	const {chat_id} = useParams();
	const navigate = useNavigate();
	
	const chat = reaxel_Chats.store.chats.find(chat => chat.chat_id === chat_id);
	
	if(!chat){
		
		console.warn( `找不到与query匹配的chat_id:${chat_id}` );
	}
	useLayoutEffect(() => {
		if(!chat){
			navigate('/');
		}
	},[chat_id]);
	
	const messages = chat?.children.map(id => {
		return reaxel_Chats.store.messages.find(msg => msg.message_id === id);
	}) || [];
	
	return {
		chat_id,
		chat,
		messages,
	}
}


import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import {
	useNavigate ,
	useParams,
} from 'react-router-dom';
