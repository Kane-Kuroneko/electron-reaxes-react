/**
 * 单个顶级菜单项（下拉弹出由 DropdownView BrowserWindow 处理）
 */
export const MenuBarItem = reaxper( ( {
	item ,
	index ,
	isOpen ,
	onToggle ,
	onHover ,
	onItemAction ,
} : {
	item : MenuView.TopLevelItem;
	index : number;
	isOpen : boolean;
	onToggle : () => void;
	onHover : () => void;
	onItemAction : ( action : MenuView.Action ) => void;
} ) => {
	const hasSubmenu = ( item.submenu?.length || 0 ) > 0;

	return (
		<div
			className={ `main-view-bar-item ${ isOpen ? 'main-view-bar-item--open' : '' }` }
			onPointerEnter={ () => {
				if( hasSubmenu ) {
					onHover();
				}
			} }
			data-menu-index={ index }
			role="none"
		>
			<button
				className={ `main-view-bar-item__button ${ hasSubmenu ? '' : 'main-view-bar-item__button--action' }` }
				role="menuitem"
				aria-haspopup={ hasSubmenu ? 'true' : undefined }
				aria-expanded={ hasSubmenu ? isOpen : undefined }
				tabIndex={ index === 0 ? 0 : -1 }
				disabled={ !item.enabled }
				onMouseDown={ ( e ) => {
					if( e.button !== 0 ) return;
					e.preventDefault();
					e.stopPropagation();
					if( hasSubmenu ) {
						onToggle();
						return;
					}
					if( item.action && item.enabled ) {
						onItemAction( {
							type : 'execute' ,
							itemId : item.id ,
							action : item.action ,
							payload : item.actionPayload,
						} );
					}
				} }
				onClick={ ( e ) => {
					e.preventDefault();
					e.stopPropagation();
				} }
			>
				{ item.label }
			</button>
		</div>
	);
} );


import { reaxper } from 'reaxes-react';
import type { MenuView } from '#src/Types/MenuView';
