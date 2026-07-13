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
	const { store } = reaxel_MainView;
	const {
		closeAllMenus ,
		openFirstMenu ,
		moveTopMenu ,
		moveFocusedItem ,
		triggerFocusedItem ,
		triggerAction ,
		toggleMenu ,
		setOpenMenuIndex ,
	} = reaxel_MainView();

	const platform = store.platform;
	const barHeight = MENU_BAR_HEIGHT[platform] || 32;

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
			{ isDarwin && <div className="main-view-traffic-light-spacer" /> }

			<div className="main-view-bar" role="menubar" aria-label="Application Menu">
				<div
					className="main-view-bar__drag-layer"
					aria-hidden="true"
					onMouseDown={ ( e ) => {
						if( e.button !== 0 ) return;
						if( store.openMenuIndex >= 0 ) {
							closeAllMenus();
						}
					} }
				/>
				<div className="main-view-bar__items">
					{ store.currentContextLabel ? (
						<CurrentContextBadge label={ store.currentContextLabel } />
					) : null }
					{ store.structure.map( ( topItem , index ) => (
						<MenuBarItem
							key={ topItem.id }
							item={ topItem }
							index={ index }
							isOpen={ store.openMenuIndex === index }
							onToggle={ () => toggleMenu( index ) }
							onHover={ () => {
								if( store.openMenuIndex >= 0 ) {
									setOpenMenuIndex( index );
								}
							} }
							onItemAction={ triggerAction }
						/>
					) ) }
				</div>
			</div>
		</div>
	);
} );

const CurrentContextBadge = reaxper( ( {
	label ,
} : {
	label : string;
} ) => {
	return (
		<div
			className="main-view-context-badge"
			title={ label }
			role="status"
			aria-label={ label }
		>
			<span className="main-view-context-badge__label">{ label }</span>
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
} : {
	item : MenuView.TopLevelItem;
	index : number;
	isOpen : boolean;
	onToggle : () => void;
	onHover : () => void;
	onItemAction : ( action : MenuView.Action ) => void;
} ) => {
	const hasSubmenu = ( item.submenu?.length || 0 ) > 0;
	const isAdjacentNav = item.id === 'prev-instantiated' || item.id === 'next-instantiated';

	if( isAdjacentNav ) {
		return (
			<AdjacentNavButton
				item={ item }
				index={ index }
				onItemAction={ onItemAction }
			/>
		);
	}

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

const AdjacentNavButton = reaxper( ( {
	item ,
	index ,
	onItemAction ,
} : {
	item : MenuView.TopLevelItem;
	index : number;
	onItemAction : ( action : MenuView.Action ) => void;
} ) => {
	const isNext = item.icon === 'chevron-right';
	const Icon = isNext ? ChevronRight : ChevronLeft;
	const displayName = item.adjacentLabel || item.label;
	const ariaLabel = item.adjacentLabel
		? `${ item.label }: ${ item.adjacentLabel }`
		: item.label;

	return (
		<div
			className="main-view-bar-item main-view-bar-item--nav"
			data-menu-index={ index }
			role="none"
		>
			<button
				className={ `main-view-bar-item__button main-view-bar-item__button--nav ${ isNext ? 'main-view-bar-item__button--nav-next' : 'main-view-bar-item__button--nav-prev' }` }
				role="menuitem"
				tabIndex={ -1 }
				disabled={ !item.enabled }
				aria-label={ ariaLabel }
				title={ ariaLabel }
				onMouseDown={ ( e ) => {
					if( e.button !== 0 ) return;
					e.preventDefault();
					e.stopPropagation();
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
				{ !isNext ? (
					<span className="main-view-bar-item__nav-icon">
						<Icon size={ 13 } strokeWidth={ 2.25 } aria-hidden="true" />
					</span>
				) : null }
				<span className="main-view-bar-item__nav-name">{ displayName }</span>
				{ isNext ? (
					<span className="main-view-bar-item__nav-icon">
						<Icon size={ 13 } strokeWidth={ 2.25 } aria-hidden="true" />
					</span>
				) : null }
			</button>
		</div>
	);
} );


import { reaxel_MainView } from './reaxels/main-view';
import { reaxper } from 'reaxes-react';
import { ChevronLeft , ChevronRight } from 'lucide-react';
import type { MenuView } from '#src/Types/MenuView';
import './index.less';
