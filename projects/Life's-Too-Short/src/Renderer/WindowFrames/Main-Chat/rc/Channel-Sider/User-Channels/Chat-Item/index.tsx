export const ChatItem = reaxper((props:ChatItemProps) => {
	
	const {
		store ,
		mutate ,
		setState,
	} = useReaxable( {
		contextMenu : {
			visible : false ,
			position : {} as { x: number, y: number } ,
			
		} ,
		menu : [
			{
				key : '1' ,
				label : '选项 1' ,
				onClick : () => alert( '点击了选项 1' ),
			} ,
			{
				key : '2' ,
				label : '选项 2' ,
				onClick : () => alert( '点击了选项 2' ),
			} ,
		] ,
		
	} );
	
	useEffect(() => {
		if (!store.contextMenu.visible) return;
		const handleGlobalClick = () => {
			setState( {
				contextMenu : {
					...store.contextMenu ,
					visible : false ,
				} ,
			} );
		};
		document.addEventListener('mousedown', handleGlobalClick);
		return () => {
			document.removeEventListener('mousedown', handleGlobalClick);
		};
	}, [store.contextMenu.visible]);
	
	const { setCurrentChat } = reaxel_Chats();
	
	return <>
		<span
			className={less.chatItem}
			onContextMenu={(e) => {
				e.preventDefault();
				setTimeout( () => {
					setState( {
						contextMenu : {
							...store.contextMenu ,
							position : {
								x : e.clientX ,
								y : e.clientY,
							} ,
							visible : true ,
						},
					} );
				} );
			}}
		>{props.label}</span>
		{ store.contextMenu.visible && <div
			style={ {
				position : 'fixed' ,
				top : store.contextMenu.position.y ,
				left : store.contextMenu.position.x ,
				zIndex : 9999 ,
			} }
		>
			<Menu
				items={ store.menu }
				onClick={(mi) => {
					mi.domEvent.stopPropagation();
					console.log(mi.keyPath);
				}}
			/>
		</div> }
	</>;
})
import { Menu } from 'antd';
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
import classnames from 'classnames';

export type ChatItemProps = {
	label? : string;
	chat_id : string;
}
