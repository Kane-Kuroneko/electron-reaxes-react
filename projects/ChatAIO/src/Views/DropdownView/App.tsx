/**
 * @description DropdownView 主组件
 * 渲染在独立 frameless BrowserWindow 中（alwaysOnTop, floating 级别），
 * 用于显示下拉菜单，始终在所有 WebContentsViews 之上。
 */

export const App = reaxper( () => {
	const { store } = reaxel_DropdownView;
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

	useEffect( () => {
		if( !store.visible || store.windowWidth <= 0 || store.windowHeight <= 0 ) {
			return;
		}

		const html = document.documentElement;
		const body = document.body;
		const root = document.getElementById( 'react-app-root' );
		const width = `${ store.windowWidth }px`;
		const height = `${ store.windowHeight }px`;

		html.style.width = width;
		html.style.height = height;
		html.style.overflow = 'hidden';
		body.style.width = width;
		body.style.height = height;
		body.style.overflow = 'hidden';
		body.style.margin = '0';
		if( root ) {
			root.style.width = width;
			root.style.height = height;
			root.style.overflow = 'hidden';
		}

		return () => {
			html.style.width = '';
			html.style.height = '';
			html.style.overflow = '';
			body.style.width = '';
			body.style.height = '';
			body.style.overflow = '';
			if( root ) {
				root.style.width = '';
				root.style.height = '';
				root.style.overflow = '';
			}
		};
	} , [ store.visible , store.windowWidth , store.windowHeight ] );

	if( !store.visible || !store.items.length ) {
		return null;
	}

	const windowSizeStyle = {
		width : `${ store.windowWidth }px` ,
		height : `${ store.windowHeight }px` ,
	} as const;

	return (
		<div
			className="dropdown-view-root"
			data-theme={ store.theme }
			style={ windowSizeStyle }
			onContextMenuCapture={ ( e ) => {
				e.preventDefault();
			} }
			onMouseDown={ ( e ) => {
				const target = e.target as HTMLElement;
				if( !target.closest( '.menu-dropdown' ) ) {
					api.closeDropdownView();
				}
			} }
		>
			<div className="dropdown-view-shell">
				<MenuDropdown
					items={ store.items }
					focusedIndex={ store.focusedIndex }
					panelWidth={ store.panelWidth }
					panelHeight={ store.panelHeight }
				/>
			</div>
		</div>
	);
} );

const isSwitchAiItem = ( item : MenuView.Item ) => {
	return item.action === 'switch-ai' && typeof item.actionPayload === 'string';
};

const switchAiIdsOf = ( items : MenuView.Item[] ) => {
	return items.filter( isSwitchAiItem ).map( item => item.actionPayload as string );
};

/**
 * 下拉菜单容器。
 * Switch AI：仅 AI radio 可右键拖；Prev/Next 等 footer 钉死。左键仍切页。
 * 其它菜单（Application / View）不接 DnD。
 */
const MenuDropdown = ( {
	items ,
	focusedIndex ,
	panelWidth ,
	panelHeight ,
} : {
	items : MenuView.Item[];
	focusedIndex : number;
	panelWidth : number;
	panelHeight : number;
} ) => {
	const listRef = useRef<HTMLDivElement | null>( null );
	const draggingRef = useRef( false );
	const persistingRef = useRef( false );
	const [ isSorting , setIsSorting ] = useState( false );
	const switchAiItemsFromProps = items.filter( isSwitchAiItem );
	const footerItems = items.filter( item => !isSwitchAiItem( item ) );
	const isSwitchAiMenu = switchAiItemsFromProps.length > 0;
	const [ aiItems , setAiItems ] = useState( switchAiItemsFromProps );
	const sensors = useSensors(
		useSensor( RightClickMouseSensor , {
			activationConstraint : {
				distance : 8,
			},
		} ),
	);

	useEffect( () => {
		if( draggingRef.current || persistingRef.current ) {
			return;
		}
		setAiItems( items.filter( isSwitchAiItem ) );
	} , [ items ] );

	useEffect( () => {
		if( focusedIndex < 0 || !listRef.current ) return;
		const focusedEl = listRef.current.querySelector( `[data-item-index="${ focusedIndex }"]` ) as HTMLElement | null;
		focusedEl?.scrollIntoView( { block : 'nearest' } );
	} , [ focusedIndex ] );

	const persistOrder = async( nextItems : MenuView.Item[] , previousItems : MenuView.Item[] ) => {
		const nextIds = switchAiIdsOf( nextItems );
		const previousIds = switchAiIdsOf( previousItems );
		if( enabledAIIdsEqual( nextIds , previousIds ) ) {
			return;
		}
		persistingRef.current = true;
		setAiItems( nextItems );
		try {
			const result = await api.reorderAIs( cloneForIPC( nextIds ) );
			if( !result?.success ) {
				setAiItems( previousItems );
				reportMenubarRendererError( 'reorderAIs' , result?.error || 'reorder failed' , 'dropdown-view-renderer' , {
					nextIds,
				} );
			}
		} catch ( error ) {
			setAiItems( previousItems );
			reportMenubarRendererError( 'reorderAIs' , error , 'dropdown-view-renderer' , {
				nextIds,
			} );
		} finally {
			persistingRef.current = false;
		}
	};

	const onDragStart = () => {
		draggingRef.current = true;
		setIsSorting( true );
	};

	const onDragEnd = ( event : DragEndEvent ) => {
		draggingRef.current = false;
		setIsSorting( false );
		const { active , over } = event;
		if( !over || active.id === over.id ) {
			return;
		}
		const oldIndex = aiItems.findIndex( item => item.id === active.id );
		const newIndex = aiItems.findIndex( item => item.id === over.id );
		if( oldIndex === -1 || newIndex === -1 ) {
			return;
		}
		const nextItems = arrayMove( aiItems.slice() , oldIndex , newIndex );
		void persistOrder( nextItems , aiItems );
	};

	const onDragCancel = () => {
		draggingRef.current = false;
		setIsSorting( false );
	};

	return (
		<div
			className={ `menu-dropdown${ isSorting ? ' menu-dropdown--sorting' : '' }` }
			role="menu"
			ref={ listRef }
			style={ {
				width : `${ panelWidth }px` ,
				height : `${ panelHeight }px` ,
			} as React.CSSProperties }
		>
			{ isSwitchAiMenu ? (
				<>
					<DndContext
						sensors={ sensors }
						collisionDetection={ closestCenter }
						modifiers={ [ restrictToVerticalAxis ] }
						onDragStart={ onDragStart }
						onDragEnd={ onDragEnd }
						onDragCancel={ onDragCancel }
					>
						<SortableContext
							items={ aiItems.map( item => item.id ) }
							strategy={ verticalListSortingStrategy }
						>
							{ aiItems.map( ( item , index ) => (
								<SortableSwitchAiItem
									key={ item.id }
									item={ item }
									focused={ focusedIndex === index }
									itemIndex={ index }
									sortableDisabled={ aiItems.length < 2 }
								/>
							) ) }
						</SortableContext>
					</DndContext>
					{ footerItems.map( ( item , index ) => (
						<MenuItemComponent
							key={ item.id }
							item={ item }
							focused={ focusedIndex === aiItems.length + index }
							itemIndex={ aiItems.length + index }
						/>
					) ) }
				</>
			) : items.map( ( item , index ) => (
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

const SortableSwitchAiItem = ( {
	item ,
	focused ,
	itemIndex ,
	sortableDisabled ,
} : {
	item : MenuView.Item;
	focused : boolean;
	itemIndex : number;
	sortableDisabled : boolean;
} ) => {
	const sortable = useSortable( {
		id : item.id ,
		disabled : sortableDisabled ,
	} );
	const style : React.CSSProperties = {
		transform : CSS.Translate.toString( sortable.transform ) ,
		transition : sortable.transition ,
		...( sortable.isDragging ? {
			position : 'relative' ,
			zIndex : 2 ,
			opacity : 0.92,
		} : {} ),
	};

	return (
		<MenuItemComponent
			item={ item }
			focused={ focused }
			itemIndex={ itemIndex }
			sortable={ {
				setNodeRef : sortable.setNodeRef ,
				style ,
				listeners : sortableDisabled ? undefined : sortable.listeners ,
				attributes : sortable.attributes ,
				isDragging : sortable.isDragging,
			} }
		/>
	);
};

/**
 * 单个菜单项组件
 */
const MenuItemComponent = ( {
	item ,
	focused = false ,
	itemIndex ,
	sortable ,
} : {
	item : MenuView.Item;
	focused? : boolean;
	itemIndex : number;
	sortable? : {
		setNodeRef : ( node : HTMLElement | null ) => void;
		style? : React.CSSProperties;
		listeners? : ReturnType<typeof useSortable>['listeners'];
		attributes? : ReturnType<typeof useSortable>['attributes'];
		isDragging? : boolean;
	};
} ) => {
	const [ showSubmenu , setShowSubmenu ] = useState( false );
	const [ submenuFlipLeft , setSubmenuFlipLeft ] = useState( false );
	const closeTimerRef = useRef<number | null>( null );
	const itemRef = useRef<HTMLDivElement | null>( null );

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

	useEffect( () => {
		if( !showSubmenu || !itemRef.current ) return;
		const rect = itemRef.current.getBoundingClientRect();
		const submenuWidth = 220;
		const overflowRight = rect.right + submenuWidth > window.innerWidth - 8;
		setSubmenuFlipLeft( overflowRight );
	} , [ showSubmenu ] );

	if( item.type === 'separator' ) {
		return <div className="menu-item menu-item--separator" role="separator" data-item-index={ itemIndex } />;
	}

	const hasSubmenu = item.submenu && item.submenu.length > 0;
	const loadStateClass = item.loadState ? `menu-item--load-${ item.loadState }` : '';
	const sortingClass = sortable?.isDragging ? ' menu-item--sorting' : '';

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

	const setItemNode = ( node : HTMLDivElement | null ) => {
		itemRef.current = node;
		sortable?.setNodeRef( node );
	};

	return (
		<div
			ref={ setItemNode }
			className={ `menu-item ${ item.type === 'checkbox' || item.type === 'radio' ? 'menu-item--checkable' : '' } ${ !item.enabled ? 'menu-item--disabled' : '' } ${ focused ? 'menu-item--focused' : '' } ${ loadStateClass }${ sortingClass }` }
			style={ sortable?.style }
			data-item-index={ itemIndex }
			{ ...( sortable?.listeners ?? {} ) }
			{ ...( sortable?.attributes ?? {} ) }
			role="none"
			tabIndex={ -1 }
			onClick={ handleClick }
			onContextMenu={ ( e ) => {
				e.preventDefault();
			} }
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

				{/* 加载状态指示（Switch AI） */}
				{ item.loadState ? (
					<span
						className="menu-item__load-dot"
						aria-hidden="true"
					/>
				) : null }

				{/* 图标（emoji 等，loadState 项不占用此列） */}
				{ item.icon && !item.loadState ? <span className="menu-item__icon">{ item.icon }</span> : null }

				{/* 标签文本 */}
				<span className="menu-item__label">{ item.label }</span>

				{/* 仅在有快捷键时渲染，避免空占位挤压长 label / AI 名称 */}
				{ item.accelerator ? (
					<MenuAccelerator accelerator={ item.accelerator } />
				) : null }

				{/* 右侧留白，与左侧 checkmark 列对称 */}
				<span className="menu-item__side-gutter" aria-hidden="true" />

				{/* 子菜单箭头 */}
				{ hasSubmenu && <span className="menu-item__arrow">▶</span> }
			</button>

			{/* 嵌套子菜单 */}
			{ hasSubmenu && showSubmenu && (
				<div
					className={ `menu-dropdown menu-dropdown--nested ${ submenuFlipLeft ? 'menu-dropdown--nested-left' : '' }` }
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

/** 格式化并渲染菜单快捷键（按键加粗，组合符淡化） */
const MenuAccelerator = ( { accelerator } : { accelerator : string } ) => {
	const parts = formatAcceleratorParts( accelerator );
	return (
		<span className="menu-item__accelerator" aria-label={ accelerator }>
			{ parts.map( ( part , index ) => (
				<span key={ `${ part.token }-${ index }` } className="menu-item__accelerator-part">
					{ index > 0 ? <span className="menu-item__accelerator-sep">+</span> : null }
					<span className={ `menu-item__accelerator-key ${ part.isSeparator ? 'menu-item__accelerator-key--sep' : '' }` }>
						{ part.label }
					</span>
				</span>
			) ) }
		</span>
	);
};

const formatAcceleratorParts = ( accelerator : string ) => {
	const isMac = /mac/i.test( typeof navigator !== 'undefined' ? navigator.platform : '' );
	const tokenLabels:Record<string , string> = {
		CmdOrCtrl : isMac ? '⌘' : 'Ctrl' ,
		CommandOrControl : isMac ? '⌘' : 'Ctrl' ,
		Cmd : '⌘' ,
		Ctrl : 'Ctrl' ,
		Alt : isMac ? '⌥' : 'Alt' ,
		Option : isMac ? '⌥' : 'Alt' ,
		Shift : '⇧' ,
	};

	return accelerator.split( '+' ).map( token => {
		const isSeparator = token === '=' || token === '-' || token === ',' || token === '.';
		return {
			token ,
			label : tokenLabels[token] ?? token ,
			isSeparator ,
		};
	} );
};

/** 发送菜单操作到主进程并关闭 */
const triggerAction = ( action : MenuView.Action ) => {
	try {
		api.menuViewAction( cloneForIPC( action ) );
		api.closeDropdownView();
	} catch ( error ) {
		reportMenubarRendererError( 'triggerAction' , error , 'dropdown-view-renderer' , {
			action : action.action ,
			itemId : action.itemId ,
		} );
	}
};


import { RightClickMouseSensor } from './right-click-mouse-sensor.utility';
import { reaxel_DropdownView } from '#DropdownView/reaxels/dropdown-view';
import { cloneForIPC } from '#shared/utils/clone-for-ipc.utility';
import { enabledAIIdsEqual } from '#shared/utils/merge-enabled-ai-order.utility';
import { reportMenubarRendererError } from '#shared/utils/menubar-error-report.utility';
import type { MenuView } from '#src/Types/MenuView';
import {
	closestCenter ,
	DndContext ,
	useSensor ,
	useSensors ,
	type DragEndEvent ,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
	arrayMove ,
	SortableContext ,
	useSortable ,
	verticalListSortingStrategy ,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reaxper } from 'reaxes-react';
import './index.less';
