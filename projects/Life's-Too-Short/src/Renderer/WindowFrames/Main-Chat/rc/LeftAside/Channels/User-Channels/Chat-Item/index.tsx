

export const ChatItem = reaxper( ( props: ChatItemProps ) => {
	
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
	
	const { setCurrentChat } = reaxel_Chats();
	
	return <>
		<span
			className={ less.chatItem }
			onContextMenu={ handleContextMenu((e) => {
				console.log('点击了右键');
			}) }
		>{ props.label }</span>
		<ContextMenu />
	</>;
} );

import { useContextMenu } from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';

export type ChatItemProps = {
	label? : string;
	chat_id : string;
}
