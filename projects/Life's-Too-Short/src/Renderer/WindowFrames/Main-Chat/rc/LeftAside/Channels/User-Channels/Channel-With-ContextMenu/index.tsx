
export const ChannelWithContextMenu = reaxper(() => {
	const { setCurrentChat } = reaxel_Chats();
	
	const {
		handleContextMenu ,
		ContextMenu,
	} = useContextMenu( {
		menuItems : [
			{
				key : '1' ,
				label : '选项 1' ,
				onClick : () => {
					console.log( '点击了选项 1' );
				} ,
			} ,
			{
				key : '2' ,
				label : '选项 2' ,
				onClick : () => {
					console.log( '点击了选项 2' );
				} ,
			} ,
		] ,
	} );
	
	const channelItems = reaxel_Chats.store.channels.map( ( channel ): ItemType => {
		return {
			key : channel.channel_id ,
			title : channel.channel_title ,
			label : <span
				style={{display:'block'}}
				onContextMenu={ handleContextMenu( ( e ) => {
					console.log( `右键了channel:${channel.channel_title}` );
				} ) }
			>{ channel.channel_title }</span> ,
			children : reaxel_Chats.store.chats.filter( chat => chat.fk_channel_id === channel.channel_id ).map( ( chat ): ItemType => {
				return {
					key : chat.chat_id ,
					title : chat.chat_title ,
					className : "item" ,
					label : <ChatItem
						chat_id={ chat.chat_id }
						label={ chat.chat_title }
					/> ,
				};
			} ) ,
		};
	} );
	
	return <>
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
		<ContextMenu/>
	</>
})

import { useContextMenu } from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";

import { ChatItem } from '#Main-Chat/rc/LeftAside/Channels/User-Channels/Chat-Item';
import { ChannelHeader } from '#Main-Chat/rc/LeftAside/Channels/User-Channels/Header';
import { Menu  } from 'antd';
import { ItemType } from 'antd/lib/menu/interface';
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
