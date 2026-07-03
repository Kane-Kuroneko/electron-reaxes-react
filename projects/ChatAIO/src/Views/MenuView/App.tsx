/**
 * @description MenuView 主组件
 * 渲染自定义菜单栏，接收主进程推送的菜单结构，通过 IPC 发送用户操作到主进程。
 * 与 mainWindow 无缝融合：浅色菜单 chrome、全宽、跟随窗口尺寸。
 * 支持窗口拖拽（通过 Electron draggable region 实现）。
 */

const MENU_BAR_HEIGHT: Record<string, number> = {
	darwin : 38 ,
	win32 : 32 ,
	linux : 32,
};

export const App = reaxper( () => {
	const { store , setState } = reaxel_MenuView;
	const {
		toggleMenu ,
		setOpenMenuIndex ,
		closeAllMenus ,
		openFirstMenu ,
		moveTopMenu ,
		moveFocusedItem ,
		triggerFocusedItem ,
		triggerAction ,
		handleCommand,
	} = reaxel_MenuView();

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

	/* 点击菜单、下拉之外的 MenuView 空白区域才关闭。 */
	const handleRootPointerDown = ( e : React.PointerEvent ) => {
		if( e.button !== 0 ) return;
		const target = e.target as HTMLElement;
		if(
			target.closest( '.menu-view-bar' ) ||
			target.closest( '.menu-dropdown' )
		) {
			return;
		}
		if( store.openMenuIndex >= 0 ) {
			closeAllMenus();
		}
	};

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
			className="menu-view-root"
			data-theme={ store.theme }
			style={ {
				height : store.openMenuIndex >= 0 ? '100vh' : `${ barHeight }px` ,
				'--menu-bar-height' : `${ barHeight }px`,
			} as React.CSSProperties }
			onPointerDown={ handleRootPointerDown }
		>
			{/* macOS traffic light 预留区域 */}
			{ isDarwin && <div className="menu-view-traffic-light-spacer" /> }

			{/* 菜单栏 */}
			<div className="menu-view-bar" role="menubar" aria-label="Application Menu">
				<div className="menu-view-bar__drag-layer" aria-hidden="true" />
				<div className="menu-view-bar__items">
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
 * 单个顶级菜单项及其下拉子菜单
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
	const menuRef = useRef<HTMLDivElement>( null );
	const [ dropdownStyle , setDropdownStyle ] = useState<React.CSSProperties>( {} );
	const hasSubmenu = ( item.submenu?.length || 0 ) > 0;

	/* 计算下拉菜单位置：防止超出窗口右边界 */
	useLayoutEffect( () => {
		if( !isOpen || !menuRef.current ) return;

		const rect = menuRef.current.getBoundingClientRect();
		const dropdownWidth = Math.min( 320 , Math.max( 220 , getMenuWidthEstimate( item.submenu ) ) );
		const overflow = rect.left + dropdownWidth - window.innerWidth;

		setDropdownStyle( {
			minWidth : `${ dropdownWidth }px` ,
			left : `${ Math.max( 6 , rect.left - Math.max( 0 , overflow + 8 ) ) }px`,
		} );
	} , [ isOpen , item.submenu ] );

	return (
		<div
			className={ `menu-bar-item ${ isOpen ? 'menu-bar-item--open' : '' }` }
			onPointerEnter={ () => {
				if( hasSubmenu ) {
					onHover();
				}
			} }
			ref={ menuRef }
			role="none"
		>
			<button
				className={ `menu-bar-item__button ${ hasSubmenu ? '' : 'menu-bar-item__button--action' }` }
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
					if( !item.action || !item.enabled ) return;
					onItemAction( {
						type : 'execute' ,
						itemId : item.id ,
						action : item.action ,
						payload : item.actionPayload,
					} );
				} }
				onClick={ ( e ) => {
					e.preventDefault();
					e.stopPropagation();
				} }
			>
				{ item.label }
			</button>

			{/* 下拉子菜单 */}
			{ isOpen && hasSubmenu && (
				<MenuDropdown
					items={ item.submenu }
					style={ dropdownStyle }
					onItemAction={ onItemAction }
					onCloseAll={ onCloseAll }
					onItemHover={ onMenuItemHover }
					focusedItemIndex={ focusedItemIndex }
					barHeight={ barHeight }
					level={ 0 }
				/>
			) }
		</div>
	);
} );

/**
 * 下拉子菜单组件
 */
const MenuDropdown = ( {
	items ,
	style ,
	onItemAction ,
	onCloseAll ,
	onItemHover ,
	focusedItemIndex ,
	barHeight ,
	level ,
} : {
	items : MenuView.Item[];
	style : React.CSSProperties;
	onItemAction : ( action : MenuView.Action ) => void;
	onCloseAll : () => void;
	onItemHover : ( itemIndex : number ) => void;
	focusedItemIndex : number;
	barHeight : number;
	level : number;
} ) => {
	return (
		<div
			className="menu-dropdown"
			style={ {
				top : `${ barHeight }px` ,
				...style,
			} }
			role="menu"
		>
			{ items.map( ( item , index ) => (
				<MenuItemComponent
					key={ item.id }
					item={ item }
					focused={ level === 0 && focusedItemIndex === index }
					itemIndex={ index }
					onAction={ onItemAction }
					onCloseAll={ onCloseAll }
					onHoverItem={ onItemHover }
					level={ level }
				/>
			) ) }
		</div>
	);
};

/**
 * 单个菜单项组件
 */
const MenuItemComponent = ( {
	item ,
	onAction ,
	onCloseAll ,
	onHoverItem ,
	focused = false ,
	itemIndex ,
	level = 0,
} : {
	item : MenuView.Item;
	onAction : ( action : MenuView.Action ) => void;
	onCloseAll : () => void;
	onHoverItem : ( itemIndex : number ) => void;
	focused? : boolean;
	itemIndex : number;
	level? : number;
} ) => {
	const [ showSubmenu , setShowSubmenu ] = useState( false );
	const itemRef = useRef<HTMLDivElement>( null );
	const [ submenuStyle , setSubmenuStyle ] = useState<React.CSSProperties>( {} );
	const closeTimerRef = useRef<number | null>( null );

	const clearCloseTimer = () => {
		if( closeTimerRef.current === null ) return;
		window.clearTimeout( closeTimerRef.current );
		closeTimerRef.current = null;
	};

	/* 计算子菜单位置 */
	useLayoutEffect( () => {
		if( !showSubmenu || !itemRef.current ) return;
		const rect = itemRef.current.getBoundingClientRect();
		const subWidth = Math.min( 320 , Math.max( 220 , getMenuWidthEstimate( item.submenu || [] ) ) );
		const overflow = rect.right + subWidth - window.innerWidth;

		setSubmenuStyle( {
			top : `${ Math.max( 4 , rect.top ) }px` ,
			left : overflow > 0 ? `${ Math.max( 6 , rect.left - subWidth - 4 ) }px` : `${ rect.right - 2 }px`,
			minWidth : `${ subWidth }px`,
		} );
	} , [ showSubmenu , item.submenu ] );

	useEffect( () => {
		return () => {
			clearCloseTimer();
		};
	} , [] );

	if( item.type === 'separator' ) {
		return <div className="menu-item menu-item--separator" role="separator" />;
	}

	const hasSubmenu = item.submenu && item.submenu.length > 0;

	const handleClick = ( e : React.MouseEvent ) => {
		e.stopPropagation();
		if( !item.enabled ) return;

		if( hasSubmenu ) {
			setShowSubmenu( !showSubmenu );
			return;
		}

		onAction( {
			type : item.type === 'checkbox' || item.type === 'radio' ? 'toggle' : 'execute' ,
			itemId : item.id ,
			action : item.action ,
			payload : item.actionPayload,
		} );
		onCloseAll();
	};

	return (
		<div
			className={ `menu-item ${ item.type === 'checkbox' || item.type === 'radio' ? 'menu-item--checkable' : '' } ${ !item.enabled ? 'menu-item--disabled' : '' } ${ focused ? 'menu-item--focused' : '' }` }
			onClick={ handleClick }
			onPointerEnter={ () => {
				clearCloseTimer();
				if( level === 0 ) {
					onHoverItem( itemIndex );
				}
				if( hasSubmenu ) setShowSubmenu( true );
			} }
			onPointerLeave={ () => {
				if( hasSubmenu ) {
					clearCloseTimer();
					closeTimerRef.current = window.setTimeout( () => setShowSubmenu( false ) , 180 );
				}
			} }
			ref={ itemRef }
			role="none"
		>
			<button
				className="menu-item__button"
				role={ item.type === 'checkbox' ? 'menuitemcheckbox' : item.type === 'radio' ? 'menuitemradio' : 'menuitem' }
				aria-checked={ item.type === 'checkbox' || item.type === 'radio' ? item.checked : undefined }
				aria-disabled={ !item.enabled }
				disabled={ !item.enabled }
				tabIndex={ -1 }
			>
				{/* 选中标记 */}
				<span className="menu-item__checkmark">
					{ ( item.type === 'checkbox' || item.type === 'radio' ) && item.checked ? '✓' : '' }
				</span>

				{/* 图标 */}
				{ item.icon && <span className="menu-item__icon">{ item.icon }</span> }

				{/* 标签文本 */}
				<span className="menu-item__label">{ item.label }</span>

				{/* 快捷键 */}
				{ item.accelerator && (
					<span className="menu-item__accelerator">{ item.accelerator }</span>
				) }

				{/* 子菜单箭头 */}
				{ hasSubmenu && <span className="menu-item__arrow">▶</span> }
			</button>

			{/* 嵌套子菜单 */}
			{ hasSubmenu && showSubmenu && (
				<div
					className="menu-dropdown menu-dropdown--nested"
					style={ submenuStyle }
					role="menu"
					onPointerEnter={ clearCloseTimer }
					onPointerLeave={ () => {
						clearCloseTimer();
						closeTimerRef.current = window.setTimeout( () => setShowSubmenu( false ) , 180 );
					} }
				>
					{ item.submenu!.map( ( subItem , subIndex ) => (
						<MenuItemComponent
							key={ subItem.id }
							item={ subItem }
							onAction={ onAction }
							onCloseAll={ onCloseAll }
							onHoverItem={ onHoverItem }
							itemIndex={ subIndex }
							level={ level + 1 }
						/>
					) ) }
				</div>
			) }
		</div>
	);
};

const getMenuWidthEstimate = (items:MenuView.Item[]) => {
	const maxLabelLength = items.reduce( ( max , item ) => {
		return Math.max(
			max ,
			item.type === 'separator' ? 0 : item.label.length + ( item.accelerator?.length || 0 ),
		);
	} , 0 );
	return Math.min( 320 , Math.max( 220 , maxLabelLength * 8 + 64 ) );
};

import { reaxel_MenuView } from './reaxels/menu-view';
import { reaxper } from 'reaxes-react';
import type { MenuView } from '#src/Types/MenuView';
import './index.less';
