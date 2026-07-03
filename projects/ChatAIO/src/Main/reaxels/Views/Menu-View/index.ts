const MENU_BAR_HEIGHT = process.platform === 'darwin' ? 38 : 32;

export const reaxel_MenuView = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		menuView : {
			view : checkAs<WebContentsView>( null ) ,
			loaded : false ,
			expandedHeight : MENU_BAR_HEIGHT,
		} ,
	} );

	let ipcRegistered = false;
	let mainWindowEventsBound = false;

	const registerIpc = () => {
		if( ipcRegistered ) return;
		ipcRegistered = true;
		setMenuShortcutHandlers( {
			reload : handleReloadView ,
			forceReload : handleForceReloadView ,
			toggleDevTools : handleToggleDevTools ,
			togglePromptLeft : () => reaxel_PromptViews().togglePromptView( 'left' ) ,
			togglePromptRight : () => reaxel_PromptViews().togglePromptView( 'right' ) ,
			actualSize : () => handleZoom( 0 ) ,
			zoomIn : () => handleZoomRelative( 0.5 ) ,
			zoomOut : () => handleZoomRelative( -0.5 ),
		} );

		useIpcRendererToMain( 'menu-view:action' ).on( ( _ , action ) => {
			executeMenuAction( action );
		} );

		useIpcRendererToMain( 'menu-view:ready' ).on( () => {
			sendMenuStructure();
		} );

		useIpcRendererToMain( 'menu-view:resize' ).on( ( _ , height ) => {
			setMenuViewHeight( height );
		} );
	};

	const initMenuView = () => {
		registerIpc();

		const existingView = store.menuView.view;
		if( existingView && !existingView.webContents.isDestroyed() ) {
			ensureLayerOrder();
			return existingView;
		}

		const view = initWebContentsView( {
			type : 'Menu-View' ,
			refreshBounds : syncBounds ,
			webPreferences : {
				preload : path.join( reaxel_ElectronENV().absAppRunningPath , 'preload.js' ),
			},
		} );

		view.setBackgroundColor( '#00000000' );
		setState.menuView( {
			view ,
			loaded : false ,
			expandedHeight : MENU_BAR_HEIGHT,
		} );

		view.webContents.on( 'did-finish-load' , () => {
			setState.menuView( { loaded : true } );
			sendMenuStructure();
		} );
		view.webContents.on( 'blur' , () => {
			closeMenuRenderer();
		} );
		view.webContents.once( 'destroyed' , () => {
			setState.menuView( {
				view : null ,
				loaded : false ,
				expandedHeight : MENU_BAR_HEIGHT,
			} );
		} );

		bindMainWindowEvents();
		ensureLayerOrder();
		return view;
	};

	const setMenuViewHeight = (height:number) => {
		const view = store.menuView.view;
		if( !view || view.webContents.isDestroyed() ) return;
		if( mainWindow.isDestroyed() ) return;

		const contentBounds = mainWindow.getContentBounds();
		const nextHeight = Math.max( MENU_BAR_HEIGHT , Math.min( Math.round( height ) , contentBounds.height ) );
		if( store.menuView.expandedHeight !== nextHeight ) {
			setState.menuView( { expandedHeight : nextHeight } );
		}
		syncBounds( view , nextHeight );
		ensureLayerOrder();
	};

	const syncBounds = (
		view = store.menuView.view ,
		height = store.menuView.expandedHeight || MENU_BAR_HEIGHT,
	) => {
		if( !view || view.webContents.isDestroyed() ) return;
		if( mainWindow.isDestroyed() ) return;

		const contentBounds = mainWindow.getContentBounds();
		const targetHeight = Math.max( MENU_BAR_HEIGHT , Math.min( height , contentBounds.height ) );
		const targetBounds = {
			x : 0 ,
			y : 0 ,
			width : contentBounds.width ,
			height : targetHeight,
		};
		const currentBounds = view.getBounds();
		if(
			currentBounds.x === targetBounds.x
			&& currentBounds.y === targetBounds.y
			&& currentBounds.width === targetBounds.width
			&& currentBounds.height === targetBounds.height
		) {
			return;
		}
		view.setBounds( targetBounds );
	};

	const ensureLayerOrder = () => {
		const view = store.menuView.view;
		if( !view || view.webContents.isDestroyed() ) return;
		if( mainWindow.isDestroyed() ) return;
		mainWindow.contentView.addChildView( view );
	};

	const sendMenuStructure = () => {
		const view = store.menuView.view;
		if( !view || view.webContents.isDestroyed() ) return;
		if( !store.menuView.loaded ) return;

		useIpcMainToRenderer( 'menu-view:command' )
			.targets( [ view.webContents ] )
			.send( {
				type : 'menu-view:structure-update' ,
				payload : reaxel_Menu().createMenuData(),
			} );
	};

	const closeMenuRenderer = () => {
		const view = store.menuView.view;
		if( view && !view.webContents.isDestroyed() && store.menuView.loaded ) {
			useIpcMainToRenderer( 'menu-view:command' )
				.targets( [ view.webContents ] )
				.send( { type : 'menu-view:close' } );
		}
		setMenuViewHeight( MENU_BAR_HEIGHT );
	};

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
				console.warn( '[MenuView] unknown action:' , action.action );
		}

		closeMenuRenderer();
		reaxel_Menu().scheduleMenuUpdate();
		setImmediate( ensureLayerOrder );
	};

	const bindMainWindowEvents = () => {
		if( mainWindowEventsBound ) return;
		mainWindowEventsBound = true;

		mainWindow.on( 'resize' , () => {
			closeMenuRenderer();
			syncBounds();
		} );
		mainWindow.on( 'maximize' , () => {
			closeMenuRenderer();
			syncBounds();
		} );
		mainWindow.on( 'unmaximize' , () => {
			closeMenuRenderer();
			syncBounds();
		} );
		mainWindow.on( 'enter-full-screen' , () => {
			store.menuView.view?.setVisible( false );
		} );
		mainWindow.on( 'leave-full-screen' , () => {
			const view = store.menuView.view;
			if( view && !view.webContents.isDestroyed() ) {
				view.setVisible( true );
				syncBounds( view , MENU_BAR_HEIGHT );
				ensureLayerOrder();
			}
		} );
		mainWindow.on( 'blur' , closeMenuRenderer );
		mainWindow.on( 'closed' , () => {
			setState.menuView( {
				view : null ,
				loaded : false ,
				expandedHeight : MENU_BAR_HEIGHT,
			} );
		} );
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
			console.warn( '[MenuView] Force reload loadURL failed:' , currentAIView.domain , error );
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
		initMenuView ,
		syncBounds ,
		ensureLayerOrder ,
		sendMenuStructure ,
		closeMenuRenderer,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

export const getMenuViewBarHeight = () => {
	return MENU_BAR_HEIGHT;
};

const getRuntimeSettings = ():Settings => {
	const settingsConfigService = getSettingsConfigService();
	const aiConfigService = getAIConfigService();
	return {
		...settingsConfigService.getEffectiveSettings() ,
		AIs : aiConfigService.getEffectiveAIs(),
	};
};

import { initWebContentsView } from '../utils/initWebContentsView';
import { reaxel_Menu } from '#main/reaxels/Menu';
import { Reaxel_View } from '#main/reaxels/Views';
import { reaxel_AIViews } from '#main/reaxels/Views/AI-Views';
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import { reaxel_SettingsView } from '#main/reaxels/Views/Settings-View';
import { mainWindow } from '#main/mainWindow';
import { useIpcMainToRenderer } from '#main/services/ipc';
import { useIpcRendererToMain } from '#main/services/ipc';
import { setMenuShortcutHandlers } from '#main/services/shortcuts/window-keyboard';
import { getAIConfigService } from '#main/services/settings/ai-config-service';
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import { reaxel_ElectronENV } from '#generics/reaxels/runtime-paths';
import type { MenuView } from '#src/Types/MenuView';
import type { Settings } from '#src/Types/SettingsTypes';
import {
	app ,
	autoUpdater ,
	dialog ,
	type WebContentsView,
} from 'electron';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import * as path from 'node:path';
