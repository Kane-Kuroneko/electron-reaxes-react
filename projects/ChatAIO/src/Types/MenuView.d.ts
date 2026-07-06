export namespace MenuView {
	/** 菜单项类型 */
	export type ItemType = 'normal' | 'separator' | 'checkbox' | 'radio';

	/** 单个菜单项（纯数据，可序列化跨 IPC） */
	export interface Item {
		id : string;
		label : string;
		type : ItemType;
		accelerator? : string;
		enabled : boolean;
		checked? : boolean;
		icon? : string;
		submenu? : Item[];
		action? : string;
		actionPayload? : unknown;
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
			payload : Structure;
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
		| { type : 'structure-update'; payload : MenuView.Structure }
		| { type : 'theme-update'; payload : { theme : 'light' | 'dark' } }
		| { type : 'close' };

	export interface DropdownRequest {
		items : MenuView.Item[];
		position : { x : number; y : number };
		barHeight : number;
	}
}

import type {} from 'electron';
