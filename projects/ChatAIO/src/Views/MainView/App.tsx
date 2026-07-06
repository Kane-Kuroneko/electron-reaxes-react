/**
 * @description MainView 主组件
 * 渲染在 mainWindow HTML 中，承载 MenuBar 等全局组件。
 * 使用 -webkit-app-region 实现原生窗口拖拽。
 */

const MENU_BAR_HEIGHT: Record<string, number> = {
	darwin : 38 ,
	win32 : 32 ,
	linux : 32,
};

export const App = reaxper( () => {
	const { store , setState } = reaxel_MainView;
	const {
		closeAllMenus ,
		openFirstMenu ,
		moveTopMenu ,
		moveFocusedItem ,
		triggerFocusedItem ,
		triggerAction ,
		handleCommand,
	} = reaxel_MainView();

	const platform = store.platform;
	const barHeight = MENU_BAR_HEIGHT[platform] || 32;

	/* IPC 监听：主进程推送菜单结构更新 */
	useEffect( () => {
		const disposable = api.onMenuViewCommand( command => {
			handleCommand( command );
		} );

		// 通知主进程：渲染进程已就绪，可以发送菜单数据了
		api.menuViewReady();

		return () => {
			disposable.dispose();
		};
	} , [] );

	/* 键盘事件监听 */
	useEffect( () => {
		const handleKeyDown = ( e : KeyboardEvent ) => {
			if( e.key === 'Alt' || e.key === 'F10' ) {
				e.preventDefault();
				if( store.openMenuIndex >= 0 ) {
					closeAllMenus();
				} else {
					openFirstMenu();
				}
				return;
			}
			if( store.openMenuIndex < 0 ) return;
			if( e.key === 'Escape' ) {
				e.preventDefault();
				closeAllMenus();
				return;
			}
			if( e.key === 'ArrowRight' ) {
				e.preventDefault();
				moveTopMenu( 1 );
				return;
			}
			if( e.key === 'ArrowLeft' ) {
				e.preventDefault();
				moveTopMenu( -1 );
				return;
			}
			if( e.key === 'ArrowDown' ) {
				e.preventDefault();
				moveFocusedItem( 1 );
				return;
			}
			if( e.key === 'ArrowUp' ) {
				e.preventDefault();
				moveFocusedItem( -1 );
				return;
			}
			if( e.key === 'Enter' || e.key === ' ' ) {
				e.preventDefault();
				triggerFocusedItem();
			}
		};
		window.addEventListener( 'keydown' , handleKeyDown );
		return () => window.removeEventListener( 'keydown' , handleKeyDown );
	} , [ store.openMenuIndex ] );

	const isDarwin = platform === 'darwin';

	return (
		<div
			className="main-view-root"
			data-theme={ store.theme }
			style={ {
				height : `${ barHeight }px` ,
				'--menu-bar-height' : `${ barHeight }px`,
			} as React.CSSProperties }
		>
			{/* macOS traffic light 预留区域 */}
			{ isDarwin && <div className="main-view-traffic-light-spacer" /> }

			{/* 菜单栏 */}
			<div className="main-view-bar" role="menubar" aria-label="Application Menu">
				{/* 拖拽层：覆盖整个菜单栏背景，支持窗口拖拽 */}
				<div className="main-view-bar__drag-layer" aria-hidden="true" />
				<div className="main-view-bar__items">
					{ store.structure.map( ( topItem , index ) => (
						<MenuBarItem
							key={ topItem.id }
							item={ topItem }
							index={ index }
							isOpen={ store.openMenuIndex === index }
							onToggle={ () => reaxel_MainView().toggleMenu( index ) }
							onHover={ () => {
								if( store.openMenuIndex >= 0 ) {
									setState( { openMenuIndex : index } );
								}
							} }
							onItemAction={ triggerAction }
							onCloseAll={ closeAllMenus }
							onMenuItemHover={ itemIndex => {
								setState( { focusedItemIndex : itemIndex } );
							} }
							focusedItemIndex={ store.openMenuIndex === index ? store.focusedItemIndex : -1 }
							barHeight={ barHeight }
						/>
					) ) }
				</div>
			</div>
		</div>
	);
} );

/**
 * 单个顶级菜单项（当前只渲染按钮，下拉弹出由 DropdownView BrowserWindow 处理）
 */
const MenuBarItem = reaxper( ( {
	item ,
	index ,
	isOpen ,
	onToggle ,
	onHover ,
	onItemAction ,
	onCloseAll ,
	onMenuItemHover ,
	focusedItemIndex ,
	barHeight ,
} : {
	item : MenuView.TopLevelItem;
	index : number;
	isOpen : boolean;
	onToggle : () => void;
	onHover : () => void;
	onItemAction : ( action : MenuView.Action ) => void;
	onCloseAll : () => void;
	onMenuItemHover : ( itemIndex : number ) => void;
	focusedItemIndex : number;
	barHeight : number;
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
						// 展开下拉菜单 → 请求主进程打开 DropdownView
						onToggle();
						return;
					}
					// 无子菜单的顶级操作项
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


import { reaxel_MainView } from './reaxels/main-view';
import { reaxper } from 'reaxes-react';
import type { MenuView } from '#src/Types/MenuView';
import './index.less';
