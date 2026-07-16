export const MenuBarLeftItems = reaxper( () => {
	const { store } = reaxel_MainView;
	const {
		toggleMenu ,
		setOpenMenuIndex ,
		closeAllMenus ,
		triggerAction ,
	} = reaxel_MainView();

	return (
		<div className="main-view-bar__left">
			{ store.leftMenuEntries.map( ( { item , originalIndex } ) => {
				const isOpen = store.openMenuIndex === originalIndex;
				return (
					<MenuBarItem
						key={ item.id }
						item={ item }
						index={ originalIndex }
						isOpen={ isOpen }
						onToggle={ () => toggleMenu( originalIndex , isOpen ) }
						onHover={ () => {
							if( store.openMenuIndex >= 0 ) {
								/* 主进程可能已通过 before-mouse-event 关闭 dropdown（如 drag region 点击）。
								 * 用同步 IPC 确认实际可见性，避免 stale openMenuIndex 导致 hover 重新弹出。 */
								if( !window.api.isDropdownVisible() ) {
									closeAllMenus();
									return;
								}
								setOpenMenuIndex( originalIndex );
							}
						} }
						onItemAction={ triggerAction }
					/>
				);
			} ) }
		</div>
	);
} );


import { reaxel_MainView } from '../../reaxels/main-view';
import { MenuBarItem } from '../MenuBarItem';
import { reaxper } from 'reaxes-react';
