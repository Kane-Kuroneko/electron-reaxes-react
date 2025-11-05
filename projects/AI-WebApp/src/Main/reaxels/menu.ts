export const reaxel_Menu = reaxel( () => {
	const electronStore = new ElectronStore<{
		previously_used_ai: AI,
	}>( { name : "previously-used-ai" } );
	const AIs: AI[] = [
		"chatgpt" ,
		"grok" ,
		"gemini" ,
		"deepseek" ,
	];
	const previously_used_ai = electronStore.get( "previously_used_ai" ) || "chatgpt";
	console.log( previously_used_ai );
	const datamapping = {
		chatgpt : {
			name : "ChatGPT" ,
			domain : "https://chatgpt.com/" ,
			browser_name : "chatgpt_window",
		} ,
		grok : {
			name : "Grok" ,
			domain : "https://grok.com/" ,
			browser_name : "grok_window"
			,
		} ,
		gemini : {
			name : "Gemini" ,
			domain : "https://gemini.google.com/" ,
			browser_name : "gemini_window",
		} ,
		deepseek : {
			name : "DeepSeek" ,
			domain : "https://deepseek.com/" ,
			browser_name : "deepseek_window",
		},
	};
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		current : checkAs<AI>( previously_used_ai ) ,
		
		chatgpt_window : checkAs<View>( null ) ,
		grok_window : checkAs<View>( null ) ,
		gemini_window : checkAs<View>( null ) ,
		deepseek_window : checkAs<View>( null ) ,
	} );
	
	function updateMenu() {
		const label = `Switch AI`;
		// 获取默认菜单
		let defaultMenu: Menu = Menu.getApplicationMenu();
		const existingIndex = defaultMenu.items.findIndex( item => item.label === label );
		// 创建一个新的下拉菜单项
		const newMenuItem = new MenuItem( {
			id : 'switch-ai' ,
			label ,  // 新菜单的名称
			submenu : checkAs<AI[]>( [
				"chatgpt" ,
				"grok" ,
				"gemini" ,
				"deepseek" ,
			] ).map( name => {
				const { name : menu_name } = datamapping[name];
				return {
					label : menu_name ,
					type : 'radio' ,
					checked : store.current === name ,
					click : createClickHandler( name ) ,
				};
			} ),
		} );
		if( existingIndex !== -1 ) {
			defaultMenu.items[existingIndex] = newMenuItem;
		} else {
			defaultMenu.append( newMenuItem );
		}
		
		// 设置更新后的菜单
		Menu.setApplicationMenu( defaultMenu );
	}
	
	function createClickHandler( name: AI ) {
		const {
			domain ,
			browser_name,
		} = datamapping[name];
		return async() => {
			AIs.forEach( _name => {
				const browser: WebContentsView = store[datamapping[_name].browser_name];
				if( browser && _name !== name ) {
					browser.setVisible( false );
				}
			} );
			if( store[browser_name] ) {
				store[browser_name].setVisible( true );
			} else {
				setState( {
					[browser_name] : await initWebContentsView( {
						domain ,
					} ) ,
				} );
			}
			setState( {
				current : name ,
			} );
		};
	}
	
	app.whenReady().then( async() => {
		updateMenu();
		mainWindow.on( 'resize' , () => {
			AIs.forEach( name => {
				const view: WebContentsView = store[datamapping[name].browser_name];
				if( view ) {
					view.setBounds( {
						x : 0 ,
						y : 0 ,
						width : mainWindow.getContentBounds().width ,
						height : mainWindow.getContentBounds().height ,
					} );
				}
			} );
		} );
		if( !store[datamapping[store.current].browser_name] ) {
			setState( {
				[datamapping[store.current].browser_name] : await initWebContentsView( {
					domain : datamapping[store.current].domain ,
				} ),
			} );
		}
	} );
	
	//当用户切换时重新创建menu并渲染
	obsReaction( ( first ) => {
		if( first ) return;
		updateMenu();
		electronStore.set( "previously_used_ai" , store.current );
	} , () => [ store.current ] );
	
	const rtn = {};
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

const initWebContentsView = async (options:{}&ExtraBrowserWindowOptions) => {
	
	const view = new WebContentsView({
		
	});
	
	const { width , height } = mainWindow.getContentBounds();
	
	//当用户ctrl+r时reload当前view
	view.webContents.on('before-input-event', (event, input) => {
		if (input.control && input.key.toLowerCase() === 'r') {
			if (input.shift) {
				// Ctrl+Shift+R 强制重置域名
				view.webContents.loadURL(options.domain || "https://chatgpt.com");
			} else {
				// Ctrl+R 重新加载当前页面
				view.webContents.reload();
			}
		}
	});
	view.setBounds( { x: 0, y: 0, width, height} );
	view.webContents.loadURL( options.domain || "https://chatgpt.com" );
	// view.webContents.loadURL( 'https://github.com' );
	mainWindow.contentView.addChildView(view);
	return view;
}

type AI = "chatgpt"|"grok"|"gemini"|"deepseek";

type ExtraBrowserWindowOptions = {
	domain? : string;
}
import {BrowserWindow,app, Menu, MenuItem,WebContentsView,View , } from 'electron';
import { mainWindow } from "#main/mainWindow";
import ElectronStore from 'electron-store';
