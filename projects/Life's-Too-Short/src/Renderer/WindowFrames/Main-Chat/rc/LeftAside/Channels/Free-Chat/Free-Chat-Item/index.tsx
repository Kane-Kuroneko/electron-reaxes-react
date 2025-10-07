import { useNavigate } from "react-router-dom";

export const FreeChatItem = reaxper((props:FreeChatItemProps) => {
	
	const { setCurrentChat } = reaxel_Chats();
	
	const { handleContextMenu,ContextMenu } = useContextMenu( {
		menuItems : [
			{
				key : '1' ,
				label : 'Rename' ,
				onClick : () => {
					
				} ,
			} ,
			{
				key : '2' ,
				label : <span>Archive</span> ,
				onClick : () => {
					
				} ,
			} ,
			{
				key : '3' ,
				label : <span>Share</span> ,
				onClick : () => {
					
				} ,
			} ,
			{
				key : '4' ,
				label : <span>Delete</span> ,
				onClick : () => {
					
				} ,
			} ,
		] ,
	} );
	
	const navigate = useNavigate()
	
	return <>
		<span
			className={ less.freeChatItem }
			onClick={() => {
				navigate( `/chat/${ props.chat_id }` );
			}}
			onContextMenu={ handleContextMenu( ( e ) => {
				console.log( `右键了菜单chat_id:${props.chat_id}` );
			} ) }
		>
			{ props.label }
		</span>
		<ContextMenu/>
	</>;
})

export type FreeChatItemProps = {
	label? : string;
	chat_id : string;
}


import { useContextMenu } from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';import { Button } from "antd";

