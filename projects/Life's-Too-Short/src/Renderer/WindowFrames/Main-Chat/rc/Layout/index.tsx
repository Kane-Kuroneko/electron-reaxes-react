

export const Layout = reaxper( () => {
	
	const outlet = useOutlet();
	const {chat_id} = useChat();
	
	useEffect(() => {
		if(!chat_id){
			reaxel_Chats.setState( { current_chat_id : null } );
		}
	},[chat_id]);
	return <div className={ less['layout'] }>
		<LeftSide />
		{ outlet }
		<FloatBottomRight />
		
		<QueryRoute
			queryKey="settings"
			element={<Settings />}
			queryValue={['general']}
		/>
		{/*无渲染组件,作外部navigate的内奸*/}
		<OutsideNavigate/>
		<HookComponent/>
		<HookInChildrenComponent>{(reg) => {
			const nav = useNavigate();
			if(chat_id){
				reg((a,b) => {
					nav(`/chat/${chat_id}`);
					console.log(chat_id,a,b);
				})
			}
		}}</HookInChildrenComponent>
	</div>;
} );

import { FloatBottomRight } from '#Main-Chat/rc/Float-Btn-Group/Bottom-Right';
import { LeftSide } from "#Main-Chat/rc/LeftAside";
import { useChat } from "#Main-Chat/rc/Chat/useChat";
import { QueryRoute } from '#renderer/WindowFrames/shared/rc/QueryRoute';
import { Settings } from '#Main-Chat/rc/Settings';
import {
	HookComponent ,
	HookInChildrenComponent ,
	OutsideNavigate ,
} from "#renderer/WindowFrames/shared/hooksAPIOutsideComponents/navigate";
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import {
	useNavigate ,
	useOutlet ,
} from 'react-router-dom';
import less from './index.module.less';
