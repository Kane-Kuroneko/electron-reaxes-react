import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";


export const StickyHeader = reaxper( () => {
	const {
		chat_id ,
		chat ,
		messages ,
	} = useChat();
	if( !chat ) return null;
	
	const items: ItemType[] = [
		{
			title : chat.is_free_chat ? 
				'Free Chat' : 
				<span style={{
					display : 'flex',
					alignItems:'center'
				}}>
					<ChannelIconSvg
						style={{
							zoom : .6,
							marginInline : '0 4px',
							marginTop : '2px'
						}}
					/>
					{reaxel_Chats.store.channels.find( item => item.channel_id === chat.fk_channel_id )?.channel_title}</span> ,
			
		} ,
		{
			title : chat.chat_title ,
			
		} ,
	];
	
	return <header className={ less.chatStickyHeader }>
		<Breadcrumb
			className="breadcrumb"
			items={ items }
			// separator={ <Separator /> }
		/>
		<PromptBox />
	</header>;
} );

const Separator = () => {
	const style = {
		transform : 'rotate(270deg)' ,
	};
	return <svg
		style={style}
		viewBox="0 0 1024 1024"
		version="1.1"
		xmlns="http://www.w3.org/2000/svg"
		p-id="1853"
		width="16"
		height="16"
	>
		<path
			d="M722.773333 381.44a64 64 0 0 1 90.453334 90.453333l-252.970667 253.013334a68.266667 68.266667 0 0 1-96.512 0l-253.013333-253.013334a64 64 0 0 1 90.538666-90.453333L512 592.128l210.773333-210.773333z"
			fill="#707070"
			p-id="1854"
		></path>
	</svg>;
};

import { Breadcrumb } from 'antd';
import { PromptBox } from '#Main-Chat/rc/Chat/Prompt-Box';
import less from './index.module.less';
import { useChat } from "#Main-Chat/rc/Chat/useChat";
import { ItemType } from 'antd/lib/breadcrumb/Breadcrumb';import { ChannelIconSvg } from "#renderer/WindowFrames/shared/rc/SVG.Component/Channel-Icon.svg";

