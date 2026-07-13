export namespace MenuView {
	/** 菜单项类型 */
	export type ItemType = 'normal' | 'separator' | 'checkbox' | 'radio';

	/** 单个菜单项（纯数据，可序列化跨 IPC） */
	export type ItemLoadState = 'instantiated' | 'unloaded';

	export interface Item {
		id : string;
		label : string;
		type : ItemType;
		accelerator? : string;
		enabled : boolean;
		checked? : boolean;
		icon? : string;
		/** Switch AI 等：是否已在内存中实例化（与 checked 选中态独立） */
		loadState? : ItemLoadState;
		submenu? : Item[];
		action? : string;
		actionPayload? : unknown;
		tooltip? : string;
	}

	/** 完整菜单结构 = 顶级菜单项数组 */
	export type Structure = TopLevelItem[];

	/** 顶级菜单项（有展开的子菜单列表） */
	export interface TopLevelItem {
		id : string;
		label : string;
		submenu : Item[];
		enabled : boolean;
		action? : string;
		actionPayload? : unknown;
		accelerator? : string;
		icon? : string;
		/** Prev/Next 顶栏按钮：相邻 AI 名称（用于悬浮提示） */
		adjacentLabel? : string;
		tooltip? : string;
	}

	/** 菜单栏 chrome 元数据（当前上下文等） */
	export interface Chrome {
		currentContextLabel : string;
		settingsViewOpened : boolean;
	}

	/** structure-update 载荷 */
	export interface StructureUpdatePayload {
		structure : Structure;
		chrome : Chrome;
	}

	/** 当前展开的菜单状态（渲染进程跟踪） */
	export interface MenuState {
		structure : Structure;
		openMenuIndex : number;           // -1 表示全部关闭
		hoveredPath : string[];           // 当前悬浮路径
		focusedItemIndex : number;
		menuBarHeight : number;
	}

	/** 用户操作 */
	export interface Action {
		type : 'execute' | 'toggle';
		itemId : string;
		action? : string;
		payload? : unknown;
	}

	/** IPC 通信消息类型（从主进程发送到渲染进程的菜单命令） */
	export type MenuCommand =
		| {
			type : 'menu-view:structure-update';
			payload : StructureUpdatePayload;
		}
		| {
			type : 'menu-view:theme-update';
			payload : { theme : 'light' | 'dark' };
		}
		| {
			type : 'menu-view:close';
		};
}

export namespace MainView {
	export type Command =
		| { type : 'structure-update'; payload : MenuView.StructureUpdatePayload }
		| { type : 'theme-update'; payload : { theme : 'light' | 'dark' } }
		| { type : 'close' };

	export interface DropdownRequest {
		items : MenuView.Item[];
		anchorRect : { x : number; y : number; width : number; height : number };
		menuIndex : number;
		focusedIndex? : number;
	}
}

import type {} from 'electron';
