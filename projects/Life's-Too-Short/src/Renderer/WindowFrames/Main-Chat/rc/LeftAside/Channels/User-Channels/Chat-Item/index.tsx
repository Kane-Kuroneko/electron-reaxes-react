import { useNavigate } from "react-router-dom";


export const ChatItem = reaxper( ( props: ChatItemProps ) => {
	
	const {
		value ,
		editing ,
		reset ,
		toggleEditing,
		setValue,
	} = useEditMenuItem( { value : props.label } );

	const {
		handleContextMenu ,
		ContextMenu ,
	} = useContextMenu( {
		menuItems : [
			{
				key : 'rename' ,
				label : 'Rename' ,
				onClick : () => {
					toggleEditing( true );
				} ,
			} ,
			{
				key : 'archive' ,
				label : 'Archive' ,
				onClick : () => {} ,
			} ,
			{
				key : 'delete' ,
				label : 'Delete' ,
				onClick : () => {} ,
			} ,
		] ,
	} );
	
	const { setCurrentChat } = reaxel_Chats();
	
	const navigate = useNavigate();
	
	if( editing ) {
		return <input
			autoFocus
			className={ less.chatItem }
			value={ value }
			onBlur={ () => {
				toggleEditing( false );
			} }
			onChange={ ( e ) => {
				setValue( e.target.value );
			} }
		/>
	}
	
	
	return <>
		<span
			className={ less.chatItem }
			onContextMenu={ handleContextMenu( ( e ) => {
				console.log( '点击了右键' );
			} ) }
			onClick={ () => {
				setCurrentChat( props.chat_id );
				navigate( `/chat/${ props.chat_id }` );
			} }
		>{ props.label }</span>
		<ContextMenu />
	</>;
} );

import { useContextMenu } from "#Main-Chat/rc/LeftAside/Channels/useContextMenu";
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
import { useEditMenuItem } from "#renderer/WindowFrames/shared/hooks/useEditMenuItem";
import { useContextMenuGlobalCancel } from "#renderer/WindowFrames/shared/hooks/useContextMenuGlobalCancel";

export type ChatItemProps = {
	label?: string;
	chat_id: string;
}
