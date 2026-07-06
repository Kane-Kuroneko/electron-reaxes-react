/**
 * @description MainView 主进程 reaxel
 * 管理 DropdownView BrowserWindow、菜单 IPC 通信、菜单操作执行。
 * 不再管理 WebContentsView 生命周期——MainView 直接渲染在 mainWindow HTML 中。
 */

const MENU_BAR_HEIGHT = process.platform === 'darwin' ? 38 : 32;

export const reaxel_MainView = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		dropdownWindow : checkAs<BrowserWindow>( null ) ,
		dropdownLoaded : false ,
		loaded : false ,
	} );

	let ipcRegistered = false;

	const registerIpc = () => {
		if( ipcRegistered ) return;
		ipcRegistered = true;

		useIpcRendererToMain( 'menu-view:action' ).on( ( _ , action ) => {
			executeMenuAction( action );
		} );

		useIpcRendererToMain( 'menu-view:ready' ).on( () => {
			sendMenuStructure();
		} );

		useIpcRendererToMain( 'dropdown-view:open' ).on( ( _ , payload ) => {
			showDropdownView( payload );
		} );

		useIpcRendererToMain( 'dropdown-view:close' ).on( () => {
			hideDropdownView();
		} );
	};

	const initMainView = () => {
		registerIpc();

		// 发送菜单结构到 MainView（在 mainWindow.webContents 就绪后）
		if( mainWindow && !mainWindow.isDestroyed() ) {
			bindMainWindowEvents();
			setState( { loaded : true } );
		}
	};

	const sendMenuStructure = () => {
		if( !mainWindow || mainWindow.isDestroyed() ) return;
		if( mainWindow.webContents.isDestroyed() ) return;

		useIpcMainToRenderer( 'menu-view:command' )
			.targets( [ mainWindow.webContents ] )
			.send( {
				type : 'menu-view:structure-update' ,
				payload : reaxel_Menu().createMenuData(),
			} );
	};

	const bindMainWindowEvents = () => {
		mainWindow.on( 'resize' , () => {
			hideDropdownView();
		} );
		mainWindow.on( 'maximize' , () => {
			hideDropdownView();
		} );
		mainWindow.on( 'unmaximize' , () => {
			hideDropdownView();
		} );
		mainWindow.on( 'enter-full-screen' , () => {
			hideDropdownView();
			sendCloseToMainView();
		} );
		mainWindow.on( 'leave-full-screen' , () => {
			sendMenuStructure();
		} );
		mainWindow.on( 'move' , () => {
			// 移动时不自动关闭下拉，但需要同步 DropdownView 位置
			if( store.dropdownWindow && !store.dropdownWindow.isDestroyed() && store.dropdownWindow.isVisible() ) {
				hideDropdownView();
			}
		} );
	};

	/* ==========================================
	   DropdownView 管理
	   ========================================== */

	const showDropdownView = ( payload : {
		items : MenuView.Item[];
		anchorRect : { x : number; y : number; width : number; height : number };
		menuIndex : number;
	} ) => {
		const window = getOrCreateDropdownWindow();

		// 计算下拉窗口位置
		const contentBounds = mainWindow.getContentBounds();
		// anchorRect 是相对于 mainWindow 内容区的坐标
		const dropdownX = Math.max( 0 , Math.min( payload.anchorRect.x , contentBounds.width - 240 ) );
		const dropdownY = MENU_BAR_HEIGHT;

		// 计算高度（根据 items 数量估算）
		const itemCount = countMenuItems( payload.items );
		const dropdownHeight = Math.min( Math.max( 60 , itemCount * 28 + 16 ) , contentBounds.height - dropdownY - 16 );

		// 根据主窗口位置计算屏幕坐标
		const windowPosition = mainWindow.getPosition();
		const screenX = windowPosition[0] + dropdownX;
		const screenY = windowPosition[1] + dropdownY;

		window.setBounds( {
			x : screenX ,
			y : screenY ,
			width : 240 ,
			height : dropdownHeight,
		} );

		sendDropdownCommand( {
			type : 'show' ,
			items : payload.items ,
			theme : getCurrentTheme() ,
			focusedIndex : -1 ,
		} );

		window.showInactive();
	};

	const hideDropdownView = () => {
		const window = store.dropdownWindow;
		if( window && !window.isDestroyed() ) {
			window.hide();
		}
		sendCloseToMainView();
	};

	const getOrCreateDropdownWindow = () => {
		const existingWindow = store.dropdownWindow;
		if( existingWindow && !existingWindow.isDestroyed() ) {
			return existingWindow;
		}

		const dropdownWindow = new BrowserWindow( {
			parent : mainWindow ,
			show : false ,
			frame : false ,
			transparent : true ,
			backgroundColor : '#00000000' ,
			hasShadow : true ,
			resizable : false ,
			movable : false ,
			minimizable : false ,
			maximizable : false ,
			fullscreenable : false ,
			skipTaskbar : true ,
			focusable : true ,
			acceptFirstMouse : true ,
			alwaysOnTop : true ,
			webPreferences : {
				nodeIntegration : false ,
				contextIsolation : true ,
				backgroundThrottling : false ,
				preload : path.join( reaxel_ElectronENV().absAppRunningPath , 'preload.js' ),
			},
		} );

		dropdownWindow.setMenu( null );
		dropdownWindow.setAlwaysOnTop( true , 'floating' );

		setState( {
			dropdownWindow ,
			dropdownLoaded : false ,
		} );

		dropdownWindow.on( 'blur' , () => {
			hideDropdownView();
		} );

		dropdownWindow.on( 'closed' , () => {
			setState( {
				dropdownWindow : null ,
				dropdownLoaded : false ,
			} );
		} );

		dropdownWindow.webContents.once( 'did-finish-load' , () => {
			setState( { dropdownLoaded : true } );
		} );

		// 加载 DropdownView
		if( dev() ) {
			const url = createDevRendererEntryURL( 'DropdownView' );
			dropdownWindow.webContents.loadURL( url , getFreshRendererLoadURLOptions( url ) );
		} else {
			dropdownWindow.webContents.loadFile( getRendererEntryFilePath(
				reaxel_ElectronENV().absAppRunningPath ,
				'DropdownView'
			) );
		}

		return dropdownWindow;
	};

	const sendDropdownCommand = ( command : DropdownView.Command ) => {
		const window = store.dropdownWindow;
		if( !window || window.isDestroyed() ) return;

		useIpcMainToRenderer( 'dropdown-view:command' )
			.targets( [ window.webContents ] )
			.send( command );
	};

	const sendCloseToMainView = () => {
		if( !mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed() ) return;

		useIpcMainToRenderer( 'menu-view:command' )
			.targets( [ mainWindow.webContents ] )
			.send( { type : 'menu-view:close' } );
	};

	/* ==========================================
	   菜单操作执行（从旧 reaxel_MenuView 迁移）
	   ========================================== */

	const executeMenuAction = ( action : MenuView.Action ) => {
		switch( action.action ) {
			case 'open-settings':
				openSettingsViewInRuntime();
				break;
			case 'check-updates':
				autoUpdater.checkForUpdates();
				break;
			case 'reload-view':
				handleReloadView();
				break;
			case 'force-reload-view':
				handleForceReloadView();
				break;
			case 'toggle-devtools':
				handleToggleDevTools();
				break;
			case 'toggle-prompt-left':
				reaxel_PromptViews().togglePromptView( 'left' );
				break;
			case 'toggle-prompt-right':
				reaxel_PromptViews().togglePromptView( 'right' );
				break;
			case 'wipe-reload':
				void handleWipeAndReload();
				break;
			case 'actual-size':
				handleZoom( 0 );
				break;
			case 'zoom-in':
				handleZoomRelative( 0.5 );
				break;
			case 'zoom-out':
				handleZoomRelative( -0.5 );
				break;
			case 'toggle-fullscreen':
				mainWindow.setFullScreen( !mainWindow.isFullScreen() );
				break;
			case 'close-current-ai':
				closeCurrentAIViewMenuAction();
				break;
			case 'switch-ai':
				if( typeof action.payload === 'string' ) {
					reaxel_AIViews().showAIView( action.payload , getRuntimeSettings() );
				}
				break;
			case 'prev-instantiated':
				void Reaxel_View().turnToPreviousInstantiatedAiPage();
				break;
			case 'next-instantiated':
				void Reaxel_View().turnToNextInstantiatedAiPage();
				break;
			case 'prev-page':
				void Reaxel_View().turnToPreviousAiPage();
				break;
			case 'next-page':
				void Reaxel_View().turnToNextAiPage();
				break;
			case 'quit':
				app.quit();
				break;
			default:
				console.warn( '[MainView] unknown action:' , action.action );
		}

		hideDropdownView();
		reaxel_Menu().scheduleMenuUpdate();
	};

	const openSettingsViewInRuntime = () => {
		Reaxel_View.setState( { settingsViewOpened : true } );
		const settingsView = reaxel_SettingsView().initSettingsView();
		settingsView.setVisible( true );
		mainWindow.contentView.addChildView( settingsView );
		Reaxel_View().fitWindow();
	};

	const handleReloadView = () => {
		const view = Reaxel_View.store.settingsViewOpened
			? reaxel_SettingsView.store.settingsView.view
			: reaxel_AIViews().currentAIView?.view;
		view?.webContents.reload();
	};

	const handleForceReloadView = () => {
		if( Reaxel_View.store.settingsViewOpened ) {
			reaxel_SettingsView.store.settingsView.view?.webContents.reloadIgnoringCache();
			return;
		}
		const currentAIView = reaxel_AIViews().currentAIView;
		currentAIView?.view.webContents.loadURL( currentAIView.domain ).catch( error => {
			console.warn( '[MainView] Force reload loadURL failed:' , currentAIView.domain , error );
		} );
	};

	const handleToggleDevTools = () => {
		const view = Reaxel_View.store.settingsViewOpened
			? reaxel_SettingsView.store.settingsView.view
			: reaxel_AIViews().currentAIView?.view;
		view?.webContents.toggleDevTools();
	};

	const handleZoom = ( level : number ) => {
		const view = reaxel_AIViews().currentAIView?.view;
		if( view && !view.webContents.isDestroyed() ) {
			view.webContents.setZoomLevel( level );
		}
	};

	const handleZoomRelative = ( delta : number ) => {
		const view = reaxel_AIViews().currentAIView?.view;
		if( view && !view.webContents.isDestroyed() ) {
			view.webContents.setZoomLevel( view.webContents.getZoomLevel() + delta );
		}
	};

	const handleWipeAndReload = async () => {
		const result = await dialog.showMessageBox( {
			type : 'warning' ,
			message : 'This operation will clear all authentication data from the current page and reload it. \r\nInclude cookies, local storage, and other data.' ,
			buttons : [ 'Yes' , 'No' ] ,
			cancelId : 1 ,
			defaultId : 0,
		} );
		if( result.response !== 0 ) return;

		const { currentAIView } = reaxel_AIViews();
		if( !currentAIView ) return;
		const { origin } = new URL( currentAIView.view.webContents.getURL() );

		await currentAIView.view.webContents.clearHistory();
		await currentAIView.view.webContents.session.clearStorageData( { origin } );
		await currentAIView.view.webContents.session.clearCache();
		await currentAIView.view.webContents.session.clearData( { origins : [ origin ] } );
		await currentAIView.view.webContents.session.clearAuthCache();
		currentAIView.view.webContents.reloadIgnoringCache();
	};

	const closeCurrentAIViewMenuAction = () => {
		if( Reaxel_View().closeCurrentAIView() ) {
			reaxel_Menu().scheduleMenuUpdate();
		}
	};

	const rtn = {
		initMainView ,
		sendMenuStructure ,
		showDropdownView ,
		hideDropdownView,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

export const getMenuBarHeight = () => {
	return MENU_BAR_HEIGHT;
};

/** 估算菜单项数量（含嵌套） */
const countMenuItems = ( items : MenuView.Item[] ): number => {
	let count = 0;
	for( const item of items ) {
		count++;
		if( item.submenu ) {
			count += countMenuItems( item.submenu );
		}
	}
	return count;
};

const getRuntimeSettings = ():Settings => {
	const settingsConfigService = getSettingsConfigService();
	const aiConfigService = getAIConfigService();
	return {
		...settingsConfigService.getEffectiveSettings() ,
		AIs : aiConfigService.getEffectiveAIs(),
	};
};

const getCurrentTheme = (): 'light' | 'dark' => {
	return getAppearanceEnvironment().systemTheme;
};


import { reaxel_Menu } from '#main/reaxels/Menu';
import { Reaxel_View } from '#main/reaxels/Views';
import { reaxel_AIViews } from '#main/reaxels/Views/AI-Views';
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import { reaxel_SettingsView } from '#main/reaxels/Views/Settings-View';
import { mainWindow } from '#main/mainWindow';
import { useIpcMainToRenderer } from '#main/services/ipc';
import { useIpcRendererToMain } from '#main/services/ipc';
import {
	createDevRendererEntryURL ,
	getFreshRendererLoadURLOptions ,
	getRendererEntryFilePath,
} from '#main/services/dev/renderer-entry';
import { getAIConfigService } from '#main/services/settings/ai-config-service';
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import { reaxel_ElectronENV } from '#generics/reaxels/runtime-paths';
import { getAppearanceEnvironment } from '#main/services/appearance';
import type { MenuView } from '#src/Types/MenuView';
import type { DropdownView } from '#src/Types/DropdownView';
import type { Settings } from '#src/Types/SettingsTypes';
import {
	app ,
	autoUpdater ,
	dialog ,
	BrowserWindow,
} from 'electron';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import * as path from 'node:path';
import { dev } from 'electron-is';
