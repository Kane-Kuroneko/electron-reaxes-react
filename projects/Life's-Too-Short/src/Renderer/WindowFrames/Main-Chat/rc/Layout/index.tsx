import { useStealthChatId } from "#Main-Chat/reaxels/user-chat-input/hook-tunnels/chat.stealth-hook";

export const Layout = reaxper( () => {
	
	const outlet = useOutlet();
	useSelectChatFromQuery();
	useStealthChatId();
	
	return <div className={ less['layout'] }>
		<LeftSide />
		{ outlet }
		<QueryRoute
			queryKey="settings"
			element={ <Settings /> }
			queryValue={ [ 'general' ] }
		/>
		{/*无渲染组件,作外部navigate的内奸*/ }
		<OutsideNavigate />
		<HookComponent />
		<Stealth_Navigate_HookComponent>{ ( fn ) => {
			const nav = useNavigate();
			
			useEffect( () => {
				if( typeof fn === 'function' ) {
					fn( nav );
				}
			} , [ fn ] );
		} }</Stealth_Navigate_HookComponent>
		
		<NewChannelModal/>
	</div>;
} );

import { Stealth_Navigate_HookComponent } from '#Main-Chat/hook-tunnels/navigate';
import { FloatBottomRight } from '#Main-Chat/rc/Float-Btn-Group/Bottom-Right';
import { LeftSide } from "#Main-Chat/rc/LeftAside";
import { useChat } from "#Main-Chat/rc/Chat/useChat";
import { QueryRoute } from '#renderer/WindowFrames/shared/rc/QueryRoute';
import { Settings } from '#Main-Chat/rc/Settings';
import {
	HookComponent ,
	OutsideNavigate ,
} from "#renderer/WindowFrames/shared/hooksAPIOutsideComponents/navigate";
import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import {
	useNavigate ,
	useOutlet ,
} from 'react-router-dom';
import less from './index.module.less';
import { NewChannelModal } from "../New-Channel-Modal";
import { reaxel_UI } from "#Main-Chat/reaxels/UI";
import { useSelectChatFromQuery } from "#Main-Chat/rc/Layout/useSelectChatFromQuery";

