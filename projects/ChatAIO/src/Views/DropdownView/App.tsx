/**
 * @description DropdownView 主组件
 * 渲染在独立 frameless BrowserWindow 中（alwaysOnTop, floating 级别），
 * 用于显示下拉菜单，始终在所有 WebContentsViews 之上。
 */

export const App = reaxper( () => {
	const { store , setState } = reaxel_DropdownView;
	const { handleCommand } = reaxel_DropdownView();

	/* IPC 监听：主进程推送下拉菜单显示/隐藏命令 */
	useEffect( () => {
		const disposable = api.onDropdownViewCommand( command => {
			handleCommand( command );
		} );

		return () => {
			disposable.dispose();
		};
	} , [] );

	if( !store.items.length ) {
		return null;
	}

	return (
		<div
			className="dropdown-view-root"
			data-theme={ store.theme }
		>
			<MenuDropdown
				items={ store.items }
				focusedIndex={ store.focusedIndex }
			/>
		</div>
	);
} );

/**
 * 下拉菜单容器
 */
const MenuDropdown = ( {
	items ,
	focusedIndex ,
} : {
	items : MenuView.Item[];
	focusedIndex : number;
} ) => {
	return (
		<div className="menu-dropdown" role="menu">
			{ items.map( ( item , index ) => (
				<MenuItemComponent
					key={ item.id }
					item={ item }
					focused={ focusedIndex === index }
					itemIndex={ index }
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
	focused = false ,
	itemIndex ,
} : {
	item : MenuView.Item;
	focused? : boolean;
	itemIndex : number;
} ) => {
	const [ showSubmenu , setShowSubmenu ] = useState( false );
	const closeTimerRef = useRef<number | null>( null );

	const clearCloseTimer = () => {
		if( closeTimerRef.current === null ) return;
		window.clearTimeout( closeTimerRef.current );
		closeTimerRef.current = null;
	};

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

		triggerAction( {
			type : item.type === 'checkbox' || item.type === 'radio' ? 'toggle' : 'execute' ,
			itemId : item.id ,
			action : item.action ,
			payload : item.actionPayload,
		} );
	};

	return (
		<div
			className={ `menu-item ${ item.type === 'checkbox' || item.type === 'radio' ? 'menu-item--checkable' : '' } ${ !item.enabled ? 'menu-item--disabled' : '' } ${ focused ? 'menu-item--focused' : '' }` }
			onClick={ handleClick }
			onPointerEnter={ () => {
				clearCloseTimer();
				if( hasSubmenu ) setShowSubmenu( true );
			} }
			onPointerLeave={ () => {
				if( hasSubmenu ) {
					clearCloseTimer();
					closeTimerRef.current = window.setTimeout( () => setShowSubmenu( false ) , 180 );
				}
			} }
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
							focused={ false }
							itemIndex={ subIndex }
						/>
					) ) }
				</div>
			) }
		</div>
	);
};

/** 发送菜单操作到主进程并关闭 */
const triggerAction = ( action : MenuView.Action ) => {
	api.menuViewAction( action );
	api.closeDropdownView();
};


import { reaxel_DropdownView } from './reaxels/dropdown-view';
import { reaxper } from 'reaxes-react';
import type { MenuView } from '#src/Types/MenuView';
import './index.less';
