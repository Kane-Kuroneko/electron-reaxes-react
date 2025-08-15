export const useContextMenu = ( { menuItems }: UseContextMenuProps ) => {
	const menuRef = useRef<HTMLDivElement>( null );
	
	const {
		store ,
		setState,
	} = useReaxable( {
		visible : false ,
		position : {
			x : 0 ,
			y : 0,
		} ,
	} );
	
	
	useEffect( () => {
		if( !store.visible ) return;
		const handleGlobalClick = ( e: MouseEvent ) => {
			if( menuRef.current && (
				e.composedPath() as Node[]
			).includes( menuRef.current ) ) {
				return;
			}
			setTimeout( () => {
				setState( { visible : false } );
			} , 10 );
		};
		document.addEventListener( 'mousedown' , handleGlobalClick , true );
		return () => {
			document.removeEventListener( 'mousedown' , handleGlobalClick , true );
		};
	} , [ store.visible ] );
	
	const handleContextMenu = ( e: React.MouseEvent ) => {
		e.preventDefault();
		setTimeout( () => {
			setState( {
				position : {
					x : e.clientX ,
					y : e.clientY ,
				} ,
				visible : true ,
			} );
		} );
	};
	
	const handleMenuClick = ( cb: ( mi: MenuInfo ) => void ) => ( mi: MenuInfo ) => {
		mi.domEvent.stopPropagation();
		setState( { visible : false } );
		cb( mi );
	};
	
	const ContextMenu = reaxper( () => {
		if( store.visible ) {
			return <div
				ref={ menuRef }
				style={ {
					position : 'fixed' ,
					top : store.position.y ,
					left : store.position.x ,
					zIndex : 9999 ,
				} }
			>
				<Menu
					items={ menuItems }
					onClick={ ( mi ) => {
						mi.domEvent.stopPropagation();
						console.log( mi.domEvent.nativeEvent.composedPath().includes( menuRef.current ) );
						console.log( mi.keyPath );
						setState( {visible : false} );
					} }
				/>
			</div>;
		} else return null;
	} );
	
	return {
		handleContextMenu ,
	};
};

interface UseContextMenuProps {
	menuItems: ItemType[];
}

import { ItemType } from 'antd/lib/menu/interface';
import { MenuInfo } from 'rc-menu/lib/interface';
import { Menu } from 'antd';
