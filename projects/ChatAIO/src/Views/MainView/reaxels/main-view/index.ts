/**
 * @description MainView 渲染进程 reaxel
 * 管理菜单结构数据、展开状态等渲染进程侧状态。
 * 菜单结构通过 IPC 从主进程推送，操作事件通过 IPC 发回主进程执行。
 * 没有 resizeMenuView IPC——因为 MainView 渲染在 mainWindow HTML 中，
 * WebContentsViews 有 y=menuBarHeight 偏移，菜单栏固定在顶部。
 */

const detectOS = (): NodeJS.Platform => {
	const p = typeof navigator !== 'undefined' ? ( navigator.platform || '' ) : '';
	if( /mac/i.test( p ) ) return 'darwin';
	if( /win/i.test( p ) ) return 'win32';
	return 'linux';
};

export const getBarHeight = (): number => {
	return getMenuBarHeight();
};

const findTopMenu = ( structure : MenuView.Structure , menuId : string ) => {
	return structure.find( item => item.id === menuId ) ?? null;
};

const getMenuButtonRect = ( menuId : string ) => {
	const el = document.querySelector( `[data-menu-id="${ menuId }"]` ) as HTMLElement | null;
	if( !el ) {
		return { x : 0 , y : 0 , width : 0 , height : getBarHeight() };
	}
	const rect = el.getBoundingClientRect();
	return {
		x : rect.left ,
		y : rect.top ,
		width : rect.width ,
		height : rect.height ,
	};
};

const openDropdownForMenu = (
	structure : MenuView.Structure ,
	menuId : string ,
	focusedIndex = -1 ,
) => {
	try {
		const topItem = findTopMenu( structure , menuId );
		if( !topItem || !( topItem.submenu?.length > 0 ) ) {
			api.closeDropdownView();
			return;
		}
		api.openDropdownView( {
			items : cloneForIPC( topItem.submenu ) ,
			anchorRect : getMenuButtonRect( menuId ) ,
			menuId ,
			focusedIndex ,
		} );
	} catch ( error ) {
		reportMenubarRendererError( 'openDropdownForMenu' , error , 'main-view-renderer' , {
			menuId ,
			focusedIndex ,
		} );
	}
};

export const reaxel_MainView = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		structure : checkAs<MenuView.Structure>( [] ) ,
		leftMenuEntries : checkAs<MenuBarEntry[]>( [] ) ,
		centerNav : null as CenterNavPartition | null ,
		openMenuId : '' ,                 // '' 表示全部关闭；以菜单 id 为唯一标识
		focusedItemIndex : -1 ,           // 下拉内焦点项：单次打开的临时列表位置，随 DropdownView items 一一对应
		platform : detectOS() as NodeJS.Platform ,
		theme : 'light' as 'light' | 'dark' ,
		currentContextLabel : '' ,
		settingsViewOpened : false ,
		updateAvailable : false ,
	} );

	const applyStructurePartition = ( structure : MenuView.Structure ) => {
		const partition = partitionStructure( structure );
		setState( {
			structure ,
			leftMenuEntries : partition.leftMenuEntries ,
			centerNav : partition.centerNav ,
		} );
	};

	/** 更新菜单结构（由 IPC 回调调用） */
	const updateStructure = ( structure : MenuView.Structure ) => {
		applyStructurePartition( structure );
		if( !store.openMenuId ) return;
		const openItem = findTopMenu( structure , store.openMenuId );
		if( !openItem || !( openItem.submenu?.length > 0 ) ) {
			/* 原本展开的菜单在新结构中已消失/无子菜单 → 关闭，避免 stale id 悬挂 */
			closeAllMenus();
			return;
		}
		openDropdownForMenu( structure , store.openMenuId , store.focusedItemIndex );
	};

	/** 展开某顶级菜单，并同步 DropdownView（以 id 标识） */
	const openMenu = ( menuId : string ) => {
		const topItem = findTopMenu( store.structure , menuId );
		if( !topItem ) return;
		if( !( topItem.submenu?.length > 0 ) ) {
			closeAllMenus();
			return;
		}
		setState( {
			openMenuId : menuId ,
			focusedItemIndex : -1 ,
		} );
		openDropdownForMenu( store.structure , menuId , -1 );
	};

	/** 展开/收起某顶级菜单（以 id 标识） */
	const toggleMenu = ( menuId : string ) => {
		if( store.openMenuId === menuId ) {
			closeAllMenus();
			return;
		}
		openMenu( menuId );
	};

	/** 关闭所有展开的菜单 */
	const closeAllMenus = () => {
		setState( {
			openMenuId : '' ,
			focusedItemIndex : -1 ,
		} );
		api.closeDropdownView();
	};

	const openFirstMenu = () => {
		const first = store.structure.find( item => item.submenu?.length > 0 );
		if( first ) {
			openMenu( first.id );
		}
	};

	const moveTopMenu = ( delta : number ) => {
		const openable = store.structure.filter( item => item.submenu?.length > 0 );
		if( openable.length === 0 ) return;
		const currentPos = store.openMenuId
			? openable.findIndex( item => item.id === store.openMenuId )
			: -1;
		const base = currentPos < 0 ? ( delta > 0 ? -1 : 0 ) : currentPos;
		const nextPos = ( base + delta + openable.length ) % openable.length;
		openMenu( openable[nextPos].id );
	};

	const moveFocusedItem = ( delta : number ) => {
		const items = findTopMenu( store.structure , store.openMenuId )?.submenu || [];
		if( items.length === 0 ) return;
		let nextIndex = store.focusedItemIndex;
		if( nextIndex < 0 ) {
			nextIndex = delta > 0 ? -1 : items.length;
		}
		for( let i = 0 ; i < items.length ; i++ ) {
			nextIndex = ( nextIndex + delta + items.length ) % items.length;
			const item = items[nextIndex];
			if( item.type !== 'separator' && item.enabled ) {
				setState( { focusedItemIndex : nextIndex } );
				try {
					api.focusDropdownViewItem( nextIndex );
				} catch ( error ) {
					reportMenubarRendererError( 'moveFocusedItem' , error , 'main-view-renderer' , { nextIndex } );
				}
				return;
			}
		}
	};

	const triggerFocusedItem = () => {
		const topItem = findTopMenu( store.structure , store.openMenuId );
		if( !topItem ) return;
		if( !topItem.submenu?.length ) {
			activateItem( topItem );
			return;
		}
		const item = topItem.submenu?.[store.focusedItemIndex];
		if( !item || !item.enabled || item.type === 'separator' || item.submenu?.length ) return;
		triggerAction( {
			type : item.type === 'checkbox' || item.type === 'radio' ? 'toggle' : 'execute' ,
			itemId : item.id ,
			action : item.action ,
			payload : item.actionPayload,
		} );
	};

	/** 触发菜单项操作 */
	const triggerAction = ( action : MenuView.Action ) => {
		try {
			closeAllMenus();
			api.menuViewAction( cloneForIPC( action ) );
		} catch ( error ) {
			reportMenubarRendererError( 'triggerAction' , error , 'main-view-renderer' , {
				action : action.action ,
				itemId : action.itemId ,
			} );
		}
	};

	/** 由 item 构造并触发 execute 操作（供顶级动作项 / Prev-Next 导航复用） */
	const activateItem = ( item : MenuView.TopLevelItem ) => {
		if( !item.action || !item.enabled ) return;
		triggerAction( {
			type : 'execute' ,
			itemId : item.id ,
			action : item.action ,
			payload : item.actionPayload,
		} );
	};

	/** 顶级菜单项按下：有子菜单则开合，否则触发其动作（以 id 标识） */
	const pressTopMenuItem = ( menuId : string ) => {
		const item = findTopMenu( store.structure , menuId );
		if( !item ) return;
		if( item.submenu?.length > 0 ) {
			toggleMenu( menuId );
			return;
		}
		activateItem( item );
	};

	/**
	 * 顶级菜单项悬停切换：菜单已展开时切到该项（以 id 标识）。
	 * 主进程可能已通过 before-mouse-event 关闭 dropdown（drag 面吞 mousedown），
	 * 用同步 IPC 确认实际可见性，避免 stale openMenuId 导致 hover 重新弹出。
	 */
	const hoverTopMenuItem = ( menuId : string ) => {
		if( !store.openMenuId ) return;
		if( !api.isDropdownVisible() ) {
			closeAllMenus();
			return;
		}
		openMenu( menuId );
	};

	const isInteractiveMenubarTarget = ( target : HTMLElement ) => {
		return !!target.closest( '.main-view-bar-item' )
			|| !!target.closest( '.main-view-context-badge' )
			|| !!target.closest( '.main-view-bar__center' )
			|| !!target.closest( '.main-view-bar__right' );
	};

	/** 点击非交互空白（若事件能到达 renderer）时关闭下拉；drag 面由主进程 before-mouse-event 兜底 */
	const handleBarMouseDown = ( e : React.MouseEvent ) => {
		if( e.button !== 0 ) return;
		const target = e.target as HTMLElement;
		if( isInteractiveMenubarTarget( target ) ) {
			return;
		}
		if( store.openMenuId ) {
			closeAllMenus();
		}
	};

	const handleDragTailMouseDown = ( e : React.MouseEvent ) => {
		if( e.button !== 0 ) return;
		if( store.openMenuId ) {
			closeAllMenus();
		}
	};

	const applyMenubarTheme = ( theme : 'light' | 'dark' ) => {
		setState( { theme } );
		document.documentElement.dataset.theme = theme;
	};

	const bindKeyboardNav = () => {
		bindKeyboardNavHandler( {
			isMenuOpen : () => !!store.openMenuId ,
			closeAllMenus ,
			openFirstMenu ,
			moveTopMenu ,
			moveFocusedItem ,
			triggerFocusedItem ,
		} );
	};

	const unbindKeyboardNav = () => {
		unbindKeyboardNavHandler();
	};

	/** 处理菜单命令（主进程→渲染进程） */
	const handleCommand = ( command : MenuView.MenuCommand ) => {
		if( command.type === 'menu-view:structure-update' ) {
			setState( {
				currentContextLabel : command.payload.chrome.currentContextLabel ,
				settingsViewOpened : command.payload.chrome.settingsViewOpened ,
			} );
			updateStructure( command.payload.structure );
		} else if( command.type === 'menu-view:theme-update' ) {
			applyMenubarTheme( command.payload.theme );
		} else if( command.type === 'menu-view:close' ) {
			setState( {
				openMenuId : '' ,
				focusedItemIndex : -1 ,
			} );
			// 主进程已关闭 DropdownView，此处只同步本地状态，避免再次 close 形成回环
		}
	};

	const applyUpdateState = ( state : AppUpdater.State ) => {
		setState( { updateAvailable : state.updateAvailable } );
	};

	const rtn = {
		updateStructure ,
		toggleMenu ,
		openMenu ,
		closeAllMenus ,
		openFirstMenu ,
		moveTopMenu ,
		moveFocusedItem ,
		triggerFocusedItem ,
		triggerAction ,
		activateItem ,
		pressTopMenuItem ,
		hoverTopMenuItem ,
		handleBarMouseDown ,
		handleDragTailMouseDown ,
		bindKeyboardNav ,
		unbindKeyboardNav ,
		handleCommand ,
		applyUpdateState ,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );


import { createReaxable , reaxel } from 'reaxes';
import type { MenuView } from '#src/Types/MenuView';
import type { AppUpdater } from '#src/Types/AppUpdater';
import { cloneForIPC } from '#src/shared/utils/clone-for-ipc.utility';
import { getMenuBarHeight } from '#src/shared/menubar-geometry';
import { reportMenubarRendererError } from '#src/shared/utils/menubar-error-report.utility';
import {
	partitionStructure ,
	type CenterNavPartition ,
	type MenuBarEntry ,
} from './partition-structure.utility';
import {
	bindKeyboardNav as bindKeyboardNavHandler ,
	unbindKeyboardNav as unbindKeyboardNavHandler ,
} from './keyboard-nav';
