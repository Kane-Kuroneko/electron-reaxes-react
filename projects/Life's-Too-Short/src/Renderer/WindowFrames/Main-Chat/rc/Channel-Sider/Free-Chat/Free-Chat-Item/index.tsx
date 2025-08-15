export const FreeChatItem = reaxper((props:FreeChatItemProps) => {
	const ref = useRef();
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
				onClick : () => {
					console.log( '点击了选项 1' );
				},
			} ,
			{
				key : '2' ,
				label : '选项 2' ,
				onClick : () => {
					console.log('点击了选项 2');
				} ,
			} ,
		] as ItemType[] ,
		
	} );
	
	useEffect(() => {
		if (!store.contextMenu.visible) return;
		const handleGlobalClick = (e) => {
			console.log(e.composedPath());
			if(e.composedPath().includes(ref.current)){
				return;
			}
			setTimeout( () => {
				setState( {
					contextMenu : {
						...store.contextMenu ,
						visible : false ,
					} ,
				} );
			} ,10  );
		};
		document.addEventListener('mousedown', handleGlobalClick,true);
		return () => {
			document.removeEventListener('mousedown', handleGlobalClick);
		};
	}, [store.contextMenu.visible]);
	
	const { setCurrentChat } = reaxel_Chats();
	
	return <>
		<span
			className={less.freeChatItem}
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
			ref = {ref}
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
					console.log(mi.domEvent.nativeEvent.composedPath().includes(ref.current));
					console.log(mi.keyPath);
					setState( {
						contextMenu : {
							...store.contextMenu ,
							visible : false,
						},
					} );
				}}
			/>
		</div> }
	</>;
})
import { Menu } from 'antd';
import {ItemType} from 'antd/lib/menu/interface';
import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import less from './style.module.less';
import classnames from 'classnames';

export type FreeChatItemProps = {
	label? : string;
	chat_id : string;
}
