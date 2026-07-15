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

export const getBarHeight = ( platform: NodeJS.Platform ): number => {
	return platform === 'darwin' ? 42 : 36;
};

const getMenuButtonRect = ( index : number ) => {
	const el = document.querySelector( `[data-menu-index="${ index }"]` ) as HTMLElement | null;
	if( !el ) {
		return { x : 0 , y : 0 , width : 0 , height : getBarHeight( detectOS() ) };
	}
	const rect = el.getBoundingClientRect();
	return {
		x : rect.left ,
		y : rect.top ,
		width : rect.width ,
		height : rect.height ,
	};
};

const openDropdownForIndex = (
	structure : MenuView.Structure ,
	index : number ,
	focusedIndex = -1 ,
) => {
	try {
		const topItem = structure[index];
		if( !topItem || !( topItem.submenu?.length > 0 ) ) {
			api.closeDropdownView();
			return;
		}
		api.openDropdownView( {
			items : cloneForIPC( topItem.submenu ) ,
			anchorRect : getMenuButtonRect( index ) ,
			menuIndex : index ,
			focusedIndex ,
		} );
	} catch ( error ) {
		reportMenubarRendererError( 'openDropdownForIndex' , error , 'main-view-renderer' , {
			index ,
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
		openMenuIndex : -1 ,
		focusedItemIndex : -1 ,
		platform : detectOS() as NodeJS.Platform ,
		theme : 'light' as 'light' | 'dark' ,
		currentContextLabel : '' ,
		settingsViewOpened : false ,
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
		if( store.openMenuIndex >= 0 ) {
			if( store.openMenuIndex >= structure.length ) {
				closeAllMenus();
			} else {
				openDropdownForIndex( structure , store.openMenuIndex , store.focusedItemIndex );
			}
		}
	};

	/** 展开/切换某顶级菜单 */
	const toggleMenu = ( index : number , isCurrentlyOpen = store.openMenuIndex === index ) => {
		if( isCurrentlyOpen ) {
			closeAllMenus();
			return;
		}
		const topItem = store.structure[index];
		if( !topItem || !( topItem.submenu?.length > 0 ) ) {
			return;
		}
		setState( {
			openMenuIndex : index ,
			focusedItemIndex : -1 ,
		} );
		openDropdownForIndex( store.structure , index , -1 );
	};

	/** 只切换当前顶级菜单，并同步 DropdownView */
	const setOpenMenuIndex = ( index : number ) => {
		const topItem = store.structure[index];
		if( !topItem ) return;
		if( !( topItem.submenu?.length > 0 ) ) {
			closeAllMenus();
			return;
		}
		setState( {
			openMenuIndex : index ,
			focusedItemIndex : -1 ,
		} );
		openDropdownForIndex( store.structure , index , -1 );
	};

	/** 关闭所有展开的菜单 */
	const closeAllMenus = () => {
		setState( {
			openMenuIndex : -1 ,
			focusedItemIndex : -1 ,
		} );
		api.closeDropdownView();
	};

	const openFirstMenu = () => {
		if( store.structure.length === 0 ) return;
		const start = Math.max( 0 , store.openMenuIndex );
		for( let i = 0 ; i < store.structure.length ; i++ ) {
			const index = ( start + i ) % store.structure.length;
			if( store.structure[index]?.submenu?.length > 0 ) {
				setOpenMenuIndex( index );
				return;
			}
		}
	};

	const moveTopMenu = ( delta : number ) => {
		if( store.structure.length === 0 ) return;
		const currentIndex = store.openMenuIndex >= 0 ? store.openMenuIndex : 0;
		for( let i = 1 ; i <= store.structure.length ; i++ ) {
			const nextIndex = ( currentIndex + delta * i + store.structure.length * 10 ) % store.structure.length;
			if( store.structure[nextIndex]?.submenu?.length > 0 ) {
				setOpenMenuIndex( nextIndex );
				return;
			}
		}
	};

	const moveFocusedItem = ( delta : number ) => {
		const items = store.structure[store.openMenuIndex]?.submenu || [];
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
		const topItem = store.structure[store.openMenuIndex];
		if( !topItem ) return;
		if( !topItem.submenu?.length ) {
			if( topItem.enabled && topItem.action ) {
				triggerAction( {
					type : 'execute' ,
					itemId : topItem.id ,
					action : topItem.action ,
					payload : topItem.actionPayload,
				} );
			}
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

	const isInteractiveMenubarTarget = ( target : HTMLElement ) => {
		return !!target.closest( '.main-view-bar-item' )
			|| !!target.closest( '.main-view-context-badge' )
			|| !!target.closest( '.main-view-bar__center' );
	};

	/** 点击空白菜单栏区域时关闭下拉 */
	const handleBarMouseDown = ( e : React.MouseEvent ) => {
		if( e.button !== 0 ) return;
		const target = e.target as HTMLElement;
		if( isInteractiveMenubarTarget( target ) ) {
			return;
		}
		if( store.openMenuIndex >= 0 ) {
			closeAllMenus();
		}
	};

	const handleDragTailMouseDown = ( e : React.MouseEvent ) => {
		if( e.button !== 0 ) return;
		if( store.openMenuIndex >= 0 ) {
			closeAllMenus();
		}
	};

	const applyMenubarTheme = ( theme : 'light' | 'dark' ) => {
		setState( { theme } );
		document.documentElement.dataset.theme = theme;
	};

	const bindKeyboardNav = () => {
		bindKeyboardNavHandler( {
			getOpenMenuIndex : () => store.openMenuIndex ,
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
				openMenuIndex : -1 ,
				focusedItemIndex : -1 ,
			} );
			// 主进程已关闭 DropdownView，此处只同步本地状态，避免再次 close 形成回环
		}
	};

	const rtn = {
		updateStructure ,
		toggleMenu ,
		setOpenMenuIndex ,
		closeAllMenus ,
		openFirstMenu ,
		moveTopMenu ,
		moveFocusedItem ,
		triggerFocusedItem ,
		triggerAction ,
		handleBarMouseDown ,
		handleDragTailMouseDown ,
		bindKeyboardNav ,
		unbindKeyboardNav ,
		handleCommand,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );


import { createReaxable , reaxel } from 'reaxes';
import type { MenuView } from '#src/Types/MenuView';
import { cloneForIPC } from '#src/shared/utils/clone-for-ipc.utility';
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
