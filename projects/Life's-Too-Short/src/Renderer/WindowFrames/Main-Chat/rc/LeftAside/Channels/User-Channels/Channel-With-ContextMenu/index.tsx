import { reaxel_UI } from "#Main-Chat/reaxels/UI";

const {
	store ,
	setState,
} = createReaxable( {
	currentContextMenuChannelId : null as string | null ,
} );

export const ChannelWithContextMenu = reaxper( () => {
	const { setCurrentChat } = reaxel_Chats();
	
	const {setExpandChannels} = reaxel_UI();
	
	const {
		handleContextMenu ,
		onCancel,
		ContextMenu ,
	} = useContextMenu( {
		menuItems : [
			{
				key : 'search' ,
				label : <span>Search In This Channel</span> ,
				onClick : ({keyPath}) => {
					
					const [,channel_id] = keyPath;
					console.log(reaxel_Chats.store.channels.find( c => c.channel_id === channel_id ).channel_title);
					reaxel_Chats().setFilterScope(channel_id);
				} ,
			} ,
			{
				key : 'rename' ,
				label : 'Rename' ,
				onClick : () => {
					
				} ,
			} ,
			{
				key : 'edit' ,
				label : 'Edit' ,
				onClick : () => {
					
				} ,
			} ,
			{
				key : 'del' ,
				label : 'Delete' ,
				onClick : () => {
					
				} ,
			} ,
		] ,
	} );
	
	//关闭菜单时清除当前channel_id
	useEffect( () => onCancel( () => {
		setState( { currentContextMenuChannelId : null } );
	} ) , [] );
		
	const channelItems = reaxel_Chats.store.channels.map( ( {channel_id,channel_title} ): ItemType => channelItemWithContextMenu({
		channel_title,
		channel_id,
		ContextMenu,
		handleContextMenu,
	}) );
	
	return <>
		<Menu
			className="menu"
			theme="light"
			selectedKeys={ [ reaxel_Chats.store.current_chat_id ] }
			mode="inline"
			openKeys={reaxel_UI.store.expanded_channels.user_channels}
			onOpenChange={(keys) => {
				setExpandChannels(keys);
			}}
			items={ channelItems }
			onSelect={ ( si ) => {
				setCurrentChat( si.selectedKeys[0] );
			} }
			defaultOpenKeys={ [] }
		/>
	</>;
} );

const channelItemWithContextMenu = ( ( { 
	channel_id ,
	channel_title ,
	ContextMenu ,
	handleContextMenu ,
} : {
	channel_id : string ;
	channel_title : string;
	ContextMenu : React.FC ;
	handleContextMenu : ( handler: ( e: React.MouseEvent<HTMLSpanElement, MouseEvent> ) => void ) => ( e: React.MouseEvent<HTMLSpanElement, MouseEvent> ) => void ;
} ) => {
	
	
	return {
		key : channel_id ,
		title : channel_title ,
		label : <span
			style={ { display : 'block' } }
			onContextMenu={ handleContextMenu( ( e ) => {
				console.log( `右键了channel:${ channel_title }` );
				setState({currentContextMenuChannelId:channel_id});
			} ) }
		>
			<b>{ channel_title }</b>
			{ channel_id === store.currentContextMenuChannelId && <ContextMenu /> }
		</span> ,
		children : reaxel_Chats.store.chats.filter( chat => chat.fk_channel_id === channel_id ).map( ( chat ): ItemType => {
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
})


import { useContextMenu } from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";

import { ChatItem } from '#Main-Chat/rc/LeftAside/Channels/User-Channels/Chat-Item';
import { ChannelHeader } from '#Main-Chat/rc/LeftAside/Channels/User-Channels/Header';
import { Menu  } from 'antd';
import { ItemType } from 'antd/lib/menu/interface';
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';import { ChannelIconSvg } from "#renderer/WindowFrames/shared/rc/SVG.Component/Channel-Icon.svg";

