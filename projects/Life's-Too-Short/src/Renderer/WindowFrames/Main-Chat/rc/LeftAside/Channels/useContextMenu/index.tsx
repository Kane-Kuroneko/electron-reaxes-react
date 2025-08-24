/**
 * 自定义 Hook，用于封装右键菜单的显示与交互逻辑。
 *
 * @template UseContextMenuProps
 * @param {Object} props - Hook 参数对象。
 * @param {ItemType[]} props.menuItems - 菜单项配置，兼容 Ant Design Menu 组件的 `items` 属性。
 *
 * @returns {{
 *    handleContextMenu: (handler: (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => void) =>
 *       (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => void,
 *    ContextMenu: React.ComponentType
 * }}
 * - `handleContextMenu`：包装后的右键事件处理函数，可绑定到目标元素，实现右键弹出菜单。
 * - `ContextMenu`：渲染右键菜单的组件，需放置在组件树中保证可见性控制。
 *
 * @description
 * 该 Hook 提供右键菜单的完整封装，包括：
 * 1. 根据鼠标点击位置显示菜单。
 * 2. 点击菜单项或菜单外部区域后自动关闭。
 * 3. 菜单项点击回调可通过 `handleMenuClick` 或直接传入 `Menu` 组件的 `onClick` 实现。
 *
 * @example
 * const { handleContextMenu, ContextMenu } = useContextMenu({ menuItems });
 *
 * return (
 *    <>
 *       <span onContextMenu={handleContextMenu((e) => console.log('右键了', e))}>
 *          右键我
 *       </span>
 *       <ContextMenu />
 *    </>
 * );
 */
export const useContextMenu = ( { menuItems }: UseContextMenuProps ) => {
	
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
	
	const contextMenuRef = useContextMenuGlobalCancel<HTMLDivElement>( {
		close : () => setState( { visible : false } ) ,
	} );
	
	const handleContextMenu = (handler: (e:React.MouseEvent<HTMLSpanElement,MouseEvent>) => void) => ( e:React.MouseEvent<HTMLSpanElement,MouseEvent> ) => {
		e.preventDefault();
		setTimeout( () => {
			setState( {
				position : {
					x : e.clientX ,
					y : e.clientY ,
				} ,
				visible : true ,
			} );
			handler( e );
		} );
	};
	
	const handleMenuClick = ( cb?: ( mi: MenuInfo ) => void ) => ( mi: MenuInfo ) => {
		mi.domEvent.stopPropagation();
		setState( { visible : false } );
		cb?.( mi );
	};
	
	const ContextMenu = reaxper( () => {
		if( store.visible ) {
			return <div
				ref={ contextMenuRef }
				className={less.contextMenu}
				style={ {
					top : store.position.y ,
					left : store.position.x ,
				} }
			>
				<Menu
					style={{userSelect:'none'}}
					items={ menuItems }
					onClick={ ( mi ) => {
						mi.domEvent.stopPropagation();
						setState( {visible : false} );
					} }
				/>
			</div>;
		} else return null;
	} );
	
	return {
		handleContextMenu ,
		ContextMenu,
	};
};

interface UseContextMenuProps {
	menuItems: ItemType[];
}

import { useContextMenuGlobalCancel } from "#renderer/WindowFrames/shared/hooks/useContextMenuGlobalCancel";
import { ItemType } from 'antd/lib/menu/interface';
import { MenuInfo } from 'rc-menu/lib/interface';
import { Menu } from 'antd';
import less from './style.module.less';
