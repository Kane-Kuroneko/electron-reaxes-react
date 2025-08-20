import { useNavigate } from "react-router-dom";

export const FreeChatItem = reaxper((props:FreeChatItemProps) => {
	const { handleContextMenu,ContextMenu } = useContextMenu( {
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
	
	const navigate = useNavigate()
	
	const { setCurrentChat } = reaxel_Chats();
	
	return <>
		<span
			className={ less.freeChatItem }
			onClick={() => {
				navigate( `/chat/${ props.chat_id }` );
			}}
			onContextMenu={ handleContextMenu( ( e ) => {
				console.log( `右键了菜单chat_id:${props.chat_id}` );
			} ) }
		>{ props.label }</span>
		<ContextMenu/>
	</>;
})

export type FreeChatItemProps = {
	label? : string;
	chat_id : string;
}


import { useContextMenu } from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
