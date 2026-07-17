/**
 * 单个顶级菜单项（下拉弹出由 DropdownView BrowserWindow 处理）
 * 纯视图：交互只把事件抛给 reaxel 注入的 onPress / onHover，不承载业务逻辑。
 */
export const MenuBarItem = reaxper( ( {
	item ,
	isFirst ,
	isOpen ,
	onPress ,
	onHover ,
} : {
	item : MenuView.TopLevelItem;
	isFirst : boolean;
	isOpen : boolean;
	onPress : () => void;
	onHover : () => void;
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
			data-menu-id={ item.id }
			role="none"
		>
			<button
				className={ `main-view-bar-item__button ${ hasSubmenu ? '' : 'main-view-bar-item__button--action' }` }
				role="menuitem"
				aria-haspopup={ hasSubmenu ? 'true' : undefined }
				aria-expanded={ hasSubmenu ? isOpen : undefined }
				tabIndex={ isFirst ? 0 : -1 }
				disabled={ !item.enabled }
				onMouseDown={ ( e ) => {
					if( e.button !== 0 ) return;
					e.preventDefault();
					e.stopPropagation();
					onPress();
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
