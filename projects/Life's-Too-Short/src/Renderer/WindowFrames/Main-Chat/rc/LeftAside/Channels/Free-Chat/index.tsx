import { useChat } from "#Main-Chat/rc/Chat/useChat";

export const FreeChat = reaxper( () => {
	
	const { setCurrentChat , setFilterScope } = reaxel_Chats();
	
	const {
		toggleFreeChatExpand,
	} = reaxel_UI();
	
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
	
	
	const {
		handleContextMenu ,
		ContextMenu,
	} = useContextMenu( {
		menuItems : [
			{
				key : 'search' ,
				label : 'Search In Free Chats' ,
				onClick : () => {
					setFilterScope( 'free-chats' );
				} ,
			} ,
			{
				key : 'new' ,
				label : 'New Free Chat' ,
				onClick : () => {
					
				} ,
			} ,
			{
				key : 'collapse' ,
				label : 'Collapse All' ,
				onClick : () => {
					console.log( '点击了选项 2' );
				} ,
			} ,
		] ,
	} );
	
	return <div
		className={ less.freeChat }
	>
		<Menu
			className="menu"
			theme="light"
			selectedKeys={ [ reaxel_Chats.store.current_chat_id ] }
			mode="inline"
			openKeys={reaxel_UI.store.expanded_channels.free_chat ? ['free-chat'] : []}
			onOpenChange={([key]) => {
				toggleFreeChatExpand(key ? true : false);
			}}
			items={ [
				{
					key : 'free-chat' ,
					label : <span
						className="free-chat-title"
						onContextMenu={handleContextMenu( () => {} )}
					>
						<svg
							className="icon"
							viewBox="0 0 1024 1024"
							version="1.1"
							xmlns="http://www.w3.org/2000/svg"
							p-id="4099"
							width="20"
							height="20"
						>
							<path
								d="M512 64c259.2 0 469.333333 200.576 469.333333 448s-210.133333 448-469.333333 448a484.48 484.48 0 0 1-232.725333-58.88l-116.394667 50.645333a42.666667 42.666667 0 0 1-58.517333-49.002666l29.76-125.013334C76.629333 703.402667 42.666667 611.477333 42.666667 512 42.666667 264.576 252.8 64 512 64z m0 64C287.488 128 106.666667 300.586667 106.666667 512c0 79.573333 25.557333 155.434667 72.554666 219.285333l5.525334 7.317334 18.709333 24.192-26.965333 113.237333 105.984-46.08 27.477333 15.018667C370.858667 878.229333 439.978667 896 512 896c224.512 0 405.333333-172.586667 405.333333-384S736.512 128 512 128z m-157.696 341.333333a42.666667 42.666667 0 1 1 0 85.333334 42.666667 42.666667 0 0 1 0-85.333334z m159.018667 0a42.666667 42.666667 0 1 1 0 85.333334 42.666667 42.666667 0 0 1 0-85.333334z m158.997333 0a42.666667 42.666667 0 1 1 0 85.333334 42.666667 42.666667 0 0 1 0-85.333334z"
								fill="#333333"
								p-id="4100"
							></path>
						</svg>
						<b style={{marginLeft:4}}>Free Chats</b>
						<ContextMenu/>
					</span> ,
					className : "free-chat-title" ,
					children : freeChatItems ,
				} ,
			] }
			onSelect={ ( si ) => {
				setCurrentChat( si.selectedKeys[0] );
			} }
		/>
	</div>;
	
} );

import { NewFreeChat } from '#Main-Chat/rc/LeftAside/Channels/Free-Chat/New-Free-Chat';
import { FreeChatItem } from '#Main-Chat/rc/LeftAside/Channels/Free-Chat/Free-Chat-Item';
import { Menu } from 'antd';
import { ItemType } from 'antd/lib/menu/interface';
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
import { useContextMenu } from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";
import { reaxel_UI } from "#Main-Chat/reaxels/UI";
