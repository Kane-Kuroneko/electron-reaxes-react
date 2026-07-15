/**
 * @description DropdownView 渲染进程 reaxel
 * 管理下拉菜单的菜单项数据和聚焦状态，
 * 通过 IPC 'dropdown-view:command' 接收主进程的显示/隐藏命令。
 */

export const reaxel_DropdownView = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		items : checkAs<MenuView.Item[]>( [] ) ,
		theme : 'light' as 'light' | 'dark' ,
		focusedIndex : -1 ,
		visible : false ,
		panelWidth : 0 ,
		panelHeight : 0 ,
		windowWidth : 0 ,
		windowHeight : 0 ,
	} );

	/** 处理主进程命令 */
	const handleCommand = ( command : DropdownView.Command ) => {
		if( command.type === 'show' ) {
			setState( {
				items : command.items ,
				theme : command.theme ,
				focusedIndex : command.focusedIndex ,
				panelWidth : command.panelWidth ,
				panelHeight : command.panelHeight ,
				windowWidth : command.windowWidth ,
				windowHeight : command.windowHeight ,
				visible : true ,
			} );
		} else if( command.type === 'hide' ) {
			setState( {
				items : [] ,
				focusedIndex : -1 ,
				panelWidth : 0 ,
				panelHeight : 0 ,
				windowWidth : 0 ,
				windowHeight : 0 ,
				visible : false ,
			} );
		} else if( command.type === 'focus-item' ) {
			setState( { focusedIndex : command.index } );
		} else if( command.type === 'theme-update' ) {
			setState( { theme : command.theme } );
		}
	};

	const rtn = {
		handleCommand,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );


import { createReaxable , reaxel } from "reaxes";
import type { MenuView } from "#src/Types/MenuView";
import type { DropdownView } from "#src/Types/DropdownView";
