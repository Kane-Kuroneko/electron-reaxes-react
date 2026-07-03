/**
 * @description MenuView 渲染进程 reaxel
 * 管理菜单结构数据、展开状态、悬浮路径等渲染进程侧状态。
 * 菜单结构通过 IPC 从主进程推送，操作事件通过 IPC 发回主进程执行。
 * 负责检测平台类型以正确设定菜单栏高度和 macOS traffic light spacer。
 * 负责在菜单展开时通知主进程调整 WebContentsView 高度，避免 dropdown 被裁剪。
 */

export type MenuSide = 'client' | 'electron';

/** 根据 navigator.platform 检测运行平台 */
const detectOS = (): NodeJS.Platform => {
	const p = typeof navigator !== 'undefined' ? ( navigator.platform || '' ) : '';
	if( /mac/i.test( p ) ) return 'darwin';
	if( /win/i.test( p ) ) return 'win32';
	return 'linux';
};

/** 获取当前平台的菜单栏高度 */
export const getBarHeight = ( platform: NodeJS.Platform ): number => {
	return platform === 'darwin' ? 38 : 32;
};

export const reaxel_MenuView = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		structure : checkAs<MenuView.Structure>( [] ) ,         // 完整菜单结构
		openMenuIndex : -1 ,                                     // 当前展开的顶级菜单索引（-1=关闭）
		hoveredPath : checkAs<string[]>( [] ) ,                  // 当前悬浮路径
		focusedItemIndex : -1 ,
		menuBarHeight : 0 ,                                      // 菜单栏高度
		platform : detectOS() as NodeJS.Platform ,               // 运行平台（通过 navigator.platform 检测）
		theme : 'light' as 'light' | 'dark' ,                   // 当前主题
	} );

	/** 更新菜单结构（由 IPC 回调调用） */
	const updateStructure = ( structure : MenuView.Structure ) => {
		setState( { structure } );
	};

	/** 向主进程请求调整 MenuView WebContentsView 高度 */
	const resizeMenuView = ( height: number ) => {
		api.menuViewResize( height );
	};

	/** 展开/切换某顶级菜单 */
	const toggleMenu = ( index : number ) => {
		const willOpen = store.openMenuIndex !== index;
		if( willOpen ) {
			resizeMenuView( 9999 );
		} else {
			resizeMenuView( getBarHeight( store.platform ) );
		}
		setState( {
			openMenuIndex : willOpen ? index : -1 ,
			focusedItemIndex : -1 ,
			hoveredPath : [],
		} );
	};

	/** 只切换当前顶级菜单，不改变展开高度 */
	const setOpenMenuIndex = ( index : number ) => {
		setState( {
			openMenuIndex : index ,
			focusedItemIndex : -1 ,
			hoveredPath : [],
		} );
	};

	/** 关闭所有展开的菜单 */
	const closeAllMenus = () => {
		resizeMenuView( getBarHeight( store.platform ) );
		setState( {
			openMenuIndex : -1 ,
			focusedItemIndex : -1 ,
			hoveredPath : [],
		} );
	};

	const openFirstMenu = () => {
		if( store.structure.length === 0 ) return;
		resizeMenuView( 9999 );
		setOpenMenuIndex( Math.max( 0 , store.openMenuIndex ) );
	};

	const moveTopMenu = ( delta : number ) => {
		if( store.structure.length === 0 ) return;
		const currentIndex = store.openMenuIndex >= 0 ? store.openMenuIndex : 0;
		const nextIndex = ( currentIndex + delta + store.structure.length ) % store.structure.length;
		resizeMenuView( 9999 );
		setOpenMenuIndex( nextIndex );
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

	/** 设置悬浮路径 */
	const setHoveredPath = ( path : string[] ) => {
		setState( { hoveredPath : path } );
	};

	/** 触发菜单项操作 */
	const triggerAction = ( action : MenuView.Action ) => {
		closeAllMenus();
		// 通过 IPC 将操作发送到主进程
		api.menuViewAction( action );
	};

	/** 处理菜单命令（主进程→渲染进程） */
	const handleCommand = ( command : MenuView.MenuCommand ) => {
		if( command.type === 'menu-view:structure-update' ) {
			updateStructure( command.payload );
		} else if( command.type === 'menu-view:theme-update' ) {
			setState( { theme : command.payload.theme } );
		} else if( command.type === 'menu-view:close' ) {
			closeAllMenus();
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
		setHoveredPath ,
		triggerAction ,
		handleCommand,
		resizeMenuView,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

import { createReaxable , reaxel } from "reaxes";
import type { MenuView } from "#src/Types/MenuView";
