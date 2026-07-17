/**
 * @description MainView 主进程 reaxel
 * 管理 DropdownView BrowserWindow、菜单 IPC 通信、菜单操作执行。
 * 不再管理 WebContentsView 生命周期——MainView 直接渲染在 mainWindow HTML 中。
 */

const MENU_BAR_HEIGHT = resolveMenuBarHeight();
const DROPDOWN_MIN_WIDTH = 200;
const DROPDOWN_MAX_WIDTH = 480;
const DROPDOWN_CHAR_WIDTH = 8.2;
/* checkmark + gaps + padding + side-gutter；有快捷键列时再加 accelerator 占位 */
const DROPDOWN_ITEM_EXTRA = 56;
const DROPDOWN_ACCEL_COLUMN_EXTRA = 88;
const DROPDOWN_CHROME = {
	top : 0 ,
	right : 6 ,
	bottom : 8 ,
	left : 6 ,
} as const;

/* 须与 DropdownView/index.less 中 .menu-item__button 行高一致（height 27px + line-height 1） */
const DROPDOWN_ROW_HEIGHT = 27;
const DROPDOWN_SEPARATOR_HEIGHT = 9;
/* 4+4 panel padding + 1+1 panel border（.menu-dropdown box-sizing: border-box） */
const DROPDOWN_PANEL_VPAD = 10;

type DropdownOpenPayload = MainView.DropdownRequest;

export const reaxel_MainView = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		dropdownWindow : checkAs<BrowserWindow>( null ) ,
		dropdownLoaded : false ,
		loaded : false ,
		mainViewRendererReady : false ,
		pendingDropdownPayload : checkAs<DropdownOpenPayload | null>( null ) ,
	} );

	let ipcRegistered = false;

	const runMenubarHandler = (
		scope : string ,
		handler : () => void ,
		context? : Record<string , unknown> ,
	) => {
		try {
			handler();
		} catch ( error ) {
			logMenubarError( toMenubarErrorReport( scope , error , {
				source : 'main' ,
				context ,
			} ) );
		}
	};

	const registerIpc = () => {
		if( ipcRegistered ) return;
		ipcRegistered = true;

		useIpcRendererToMain( 'menu-view:action' ).on( ( _ , action ) => {
			runMenubarHandler( 'menu-view:action' , () => {
				executeMenuAction( action );
			} , { action : action.action , itemId : action.itemId } );
		} );

		useIpcRendererToMain( 'menu-view:ready' ).on( () => {
			runMenubarHandler( 'menu-view:ready' , () => {
				setState( { mainViewRendererReady : true } );
				preloadDropdownView();
				sendMenuStructure();
				sendMenuTheme();
			} );
		} );

		useIpcRendererToMain( 'prompt-view-appearance-preview-change' ).on( ( _ , appearance ) => {
			runMenubarHandler( 'prompt-view-appearance-preview-change' , () => {
				sendMenuTheme( appearance );
			} );
		} );

		useIpcRendererToMain( 'dropdown-view:open' ).on( ( _ , payload ) => {
			runMenubarHandler( 'dropdown-view:open' , () => {
				showDropdownView( payload );
			} , {
				menuId : payload.menuId ,
				itemCount : payload.items?.length ?? 0 ,
			} );
		} );

		useIpcRendererToMain( 'dropdown-view:close' ).on( () => {
			runMenubarHandler( 'dropdown-view:close' , () => {
				hideDropdownView( { syncMainView : false } );
			} );
		} );

		useIpcRendererToMain( 'dropdown-view:focus-item' ).on( ( _ , index ) => {
			runMenubarHandler( 'dropdown-view:focus-item' , () => {
				sendDropdownCommand( {
					type : 'focus-item' ,
					index ,
				} );
			} , { index } );
		} );

		useIpcRendererToMain( 'menubar:error-report' ).on( ( _ , report ) => {
			logMenubarError( report );
		} );

		useIpcSync( 'dropdown-view:is-visible' ).handle( () => {
			const dropdown = store.dropdownWindow;
			return !!dropdown && !dropdown.isDestroyed() && dropdown.isVisible();
		} );
	};

	const initMainView = () => {
		registerIpc();
		registerMenuShortcutHandlers();
		setMenubarDropdownDismissHandler( () => hideDropdownView() );

		if( mainWindow && !mainWindow.isDestroyed() ) {
			bindMainWindowEvents();
			bindMenubarWebContentsLogging( mainWindow.webContents , 'main-view-renderer' );
			preloadDropdownView();
			setState( { loaded : true } );
			console.log( '[Menubar] error log file:' , getMenubarErrorLogPath() );
		}
	};

	const preloadDropdownView = () => {
		if( !mainWindow || mainWindow.isDestroyed() ) return;
		getOrCreateDropdownWindow();
	};

	const sendMenuStructure = () => {
		if( !store.mainViewRendererReady ) return;
		if( !mainWindow || mainWindow.isDestroyed() ) return;
		if( mainWindow.webContents.isDestroyed() ) return;

		const menu = reaxel_Menu();
		useIpcMainToRenderer( 'menu-view:command' )
			.targets( [ mainWindow.webContents ] )
			.send( {
				type : 'menu-view:structure-update' ,
				payload : {
					structure : menu.createMenuData() ,
					chrome : menu.createMenuChrome(),
				},
			} );
	};

	const sendMenuTheme = ( previewAppearance? : Pick<PromptView.Appearance , 'theme'> ) => {
		if( !store.mainViewRendererReady ) return;
		if( !mainWindow || mainWindow.isDestroyed() ) return;
		if( mainWindow.webContents.isDestroyed() ) return;

		const theme = resolveMenubarTheme( previewAppearance );
		useIpcMainToRenderer( 'menu-view:command' )
			.targets( [ mainWindow.webContents ] )
			.send( {
				type : 'menu-view:theme-update' ,
				payload : { theme } ,
			} );

		const dropdown = store.dropdownWindow;
		if( dropdown && !dropdown.isDestroyed() && dropdown.isVisible() ) {
			sendDropdownCommand( {
				type : 'theme-update' ,
				theme ,
			} );
		}
	};

	const syncAppearanceFromSettings = () => {
		sendMenuTheme();
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
		mainWindow.on( 'minimize' , () => {
			hideDropdownView();
		} );
		mainWindow.on( 'hide' , () => {
			hideDropdownView();
		} );
		mainWindow.on( 'blur' , () => {
			hideDropdownViewIfAppUnfocused();
		} );
		mainWindow.on( 'enter-full-screen' , () => {
			hideDropdownView();
			sendCloseToMainView();
		} );
		mainWindow.on( 'leave-full-screen' , () => {
			sendMenuStructure();
		} );
		mainWindow.on( 'move' , () => {
			if( store.dropdownWindow && !store.dropdownWindow.isDestroyed() && store.dropdownWindow.isVisible() ) {
				hideDropdownView();
			}
		} );
		/* MainView HTML 壳：点空白也关掉（WCV 已有 before-mouse-event；此处兜底未覆盖区域）
		 * Windows: -webkit-app-region: drag 区域会吞掉渲染进程的 mousedown，
		 * 必须在此处从主进程关闭下拉。使用 syncMainView:false 避免 race condition
		 * （渲染进程的 openMenuId 不会被提前清空，菜单按钮点击后的 toggleMenu 判断正确）。 */
		if( !mainWindow.webContents.isDestroyed() ) {
			mainWindow.webContents.on( 'before-mouse-event' , ( _event , mouse ) => {
				if( mouse.type !== 'mouseDown' ) return;
				const dropdown = store.dropdownWindow;
				if( !dropdown || dropdown.isDestroyed() || !dropdown.isVisible() ) {
					return;
				}
				if( mouse.y < getMenuBarHeight() ) {
					/* macOS：渲染进程可直接接收菜单栏点击事件（无 drag 区域拦截）。
					 * Windows/Linux：drag 区域吞掉 mousedown，必须由主进程关闭。 */
					if( process.platform === 'darwin' ) {
						return;
					}
					hideDropdownView( { syncMainView : false } );
					return;
				}
				hideDropdownView();
			} );
		}
	};

	const hideDropdownViewIfAppUnfocused = () => {
		setTimeout( () => {
			if( !mainWindow || mainWindow.isDestroyed() ) return;

			const dropdown = store.dropdownWindow;
			const focusedWindow = BrowserWindow.getFocusedWindow();
			if( dropdown && !dropdown.isDestroyed() && focusedWindow === dropdown ) {
				return;
			}
			if( mainWindow.isFocused() ) {
				return;
			}
			hideDropdownView();
		} , 0 );
	};

	/* ==========================================
	   DropdownView 管理
	   ========================================== */

	const showDropdownView = ( payload : DropdownOpenPayload ) => {
		if( !mainWindow || mainWindow.isDestroyed() ) {
			throw new Error( 'mainWindow is not available for dropdown positioning' );
		}

		const window = getOrCreateDropdownWindow();
		setState( { pendingDropdownPayload : payload } );

		const contentBounds = mainWindow.getContentBounds();
		const anchor = payload.anchorRect;
		const panelWidth = estimateDropdownWidth( payload.items );
		const dropdownContentX = Math.max(
			0 ,
			Math.min( anchor.x , contentBounds.width - panelWidth ) ,
		);
		const dropdownContentY = anchor.y + anchor.height;

		const panelHeight = Math.min(
			estimateDropdownHeight( payload.items ) ,
			contentBounds.height - dropdownContentY - 16 ,
		);

		const windowWidth = panelWidth + DROPDOWN_CHROME.left + DROPDOWN_CHROME.right;
		const windowHeight = panelHeight + DROPDOWN_CHROME.top + DROPDOWN_CHROME.bottom;

		const screenX = contentBounds.x + dropdownContentX - DROPDOWN_CHROME.left;
		const screenY = contentBounds.y + dropdownContentY - DROPDOWN_CHROME.top;

		window.setBounds( {
			x : screenX ,
			y : screenY ,
			width : windowWidth ,
			height : windowHeight ,
		} );

		const showCommand : DropdownView.Command = {
			type : 'show' ,
			items : cloneForIPC( payload.items ) ,
			theme : getCurrentTheme() ,
			focusedIndex : payload.focusedIndex ?? -1 ,
			panelWidth ,
			panelHeight ,
			windowWidth ,
			windowHeight ,
		};

		if( store.dropdownLoaded ) {
			sendDropdownCommand( showCommand );
			if( process.platform === 'darwin' ) {
				window.showInactive();
			} else {
				/* Windows/Linux: dropdown must have focus so blur fires on main window click */
				window.show();
			}
			setState( { pendingDropdownPayload : null } );
		}
	};

	const hideDropdownView = ( options? : { syncMainView? : boolean } ) => {
		const syncMainView = options?.syncMainView !== false;
		setState( { pendingDropdownPayload : null } );
		const window = store.dropdownWindow;
		if( window && !window.isDestroyed() ) {
			sendDropdownCommand( { type : 'hide' } );
			window.hide();
		}
		if( syncMainView ) {
			sendCloseToMainView();
		}
	};

	const flushPendingDropdown = () => {
		const pending = store.pendingDropdownPayload;
		if( !pending ) return;
		const window = store.dropdownWindow;
		if( !window || window.isDestroyed() ) return;
		if( !mainWindow || mainWindow.isDestroyed() ) return;

		const contentBounds = mainWindow.getContentBounds();
		const anchor = pending.anchorRect;
		const panelWidth = estimateDropdownWidth( pending.items );
		const dropdownContentY = anchor.y + anchor.height;
		const panelHeight = Math.min(
			estimateDropdownHeight( pending.items ) ,
			contentBounds.height - dropdownContentY - 16 ,
		);
		const windowWidth = panelWidth + DROPDOWN_CHROME.left + DROPDOWN_CHROME.right;
		const windowHeight = panelHeight + DROPDOWN_CHROME.top + DROPDOWN_CHROME.bottom;

		sendDropdownCommand( {
			type : 'show' ,
			items : cloneForIPC( pending.items ) ,
			theme : getCurrentTheme() ,
			focusedIndex : pending.focusedIndex ?? -1 ,
			panelWidth ,
			panelHeight ,
			windowWidth ,
			windowHeight ,
		} );
		if( process.platform === 'darwin' ) {
			window.showInactive();
		} else {
			/* Windows/Linux: dropdown must have focus so blur fires on main window click */
			window.show();
		}
		setState( { pendingDropdownPayload : null } );
	};

	const getOrCreateDropdownWindow = () => {
		const existingWindow = store.dropdownWindow;
		if( existingWindow && !existingWindow.isDestroyed() ) {
			return existingWindow;
		}

		const dropdownWindow = new BrowserWindow( {
			show : false ,
			frame : false ,
			transparent : true ,
			backgroundColor : '#00000000' ,
			hasShadow : false ,
			useContentSize : true ,
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
		bindMenubarWebContentsLogging( dropdownWindow.webContents , 'dropdown-view-renderer' );

		setState( {
			dropdownWindow ,
			dropdownLoaded : false ,
		} );

		dropdownWindow.on( 'blur' , () => {
			hideDropdownView( { syncMainView : false } );
		} );

		dropdownWindow.on( 'closed' , () => {
			setState( {
				dropdownWindow : null ,
				dropdownLoaded : false ,
				pendingDropdownPayload : null ,
			} );
		} );

		dropdownWindow.webContents.once( 'did-finish-load' , () => {
			setState( { dropdownLoaded : true } );
			flushPendingDropdown();
		} );

		dropdownWindow.webContents.on( 'did-fail-load' , ( _event , errorCode , errorDescription , validatedURL ) => {
			logMenubarError( {
				scope : 'dropdown-view:did-fail-load' ,
				message : `${ errorDescription } (${ errorCode })` ,
				context : JSON.stringify( { validatedURL } ) ,
				source : 'main' ,
			} );
		} );

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
		if( window.webContents.isDestroyed() ) return;

		useIpcMainToRenderer( 'dropdown-view:command' )
			.targets( [ window.webContents ] )
			.send( command );
	};

	const sendCloseToMainView = () => {
		if( !store.mainViewRendererReady ) return;
		if( !mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed() ) return;

		useIpcMainToRenderer( 'menu-view:command' )
			.targets( [ mainWindow.webContents ] )
			.send( { type : 'menu-view:close' } );
	};

	/* ==========================================
	   菜单操作执行（从旧 reaxel_MenuView 迁移）
	   ========================================== */

	const executeMenuAction = ( action : MenuView.Action ) => {
		/* 必须先同步关闭并清空 MainView.openMenuId，
		   否则 switch-ai 等会触发 menu structure-update，
		   updateStructure 在 openMenuId 非空时会立刻 reopen dropdown。 */
		hideDropdownView();

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

	let menuShortcutsRegistered = false;

	const registerMenuShortcutHandlers = () => {
		if( menuShortcutsRegistered ) return;
		menuShortcutsRegistered = true;

		setMenuShortcutHandlers( {
			reload : () => handleReloadView() ,
			forceReload : () => handleForceReloadView() ,
			toggleDevTools : () => handleToggleDevTools() ,
			togglePromptLeft : () => reaxel_PromptViews().togglePromptView( 'left' ) ,
			togglePromptRight : () => reaxel_PromptViews().togglePromptView( 'right' ) ,
			actualSize : () => handleZoom( 0 ) ,
			zoomIn : () => handleZoomRelative( 0.5 ) ,
			zoomOut : () => handleZoomRelative( -0.5 ) ,
		} );
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
		sendMenuTheme ,
		syncAppearanceFromSettings ,
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

const estimateDropdownHeight = ( items : MenuView.Item[] ): number => {
	let height = DROPDOWN_PANEL_VPAD;
	for( const item of items ) {
		if( item.type === 'separator' ) {
			height += DROPDOWN_SEPARATOR_HEIGHT;
		} else {
			height += DROPDOWN_ROW_HEIGHT;
		}
	}
	return height;
};

const estimateDropdownWidth = ( items : MenuView.Item[] ): number => {
	let maxContentWidth = 0;
	const walk = ( list : MenuView.Item[] ) => {
		for( const item of list ) {
			if( item.type === 'separator' ) continue;
			const labelWidth = Math.ceil( ( item.label?.length || 0 ) * DROPDOWN_CHAR_WIDTH );
			const accelWidth = item.accelerator
				? Math.max(
					DROPDOWN_ACCEL_COLUMN_EXTRA ,
					Math.ceil( item.accelerator.length * 7 ) + 24 ,
				)
				: 0;
			const loadDotWidth = item.loadState ? 11 : 0;
			maxContentWidth = Math.max(
				maxContentWidth ,
				labelWidth + accelWidth + loadDotWidth + DROPDOWN_ITEM_EXTRA ,
			);
			if( item.submenu ) walk( item.submenu );
		}
	};
	walk( items );
	return Math.min( DROPDOWN_MAX_WIDTH , Math.max( DROPDOWN_MIN_WIDTH , maxContentWidth ) );
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
	return resolveMenubarTheme();
};

const resolveMenubarTheme = (
	previewAppearance? : Pick<PromptView.Appearance , 'theme'>,
): 'light' | 'dark' => {
	const settingsAppearance = getRuntimeSettings().appearance;
	const themePreference = normalizeThemePreference(
		previewAppearance?.theme ?? settingsAppearance.theme ,
		settingsAppearance.darkmode ,
	);
	return resolveThemePreference( themePreference , getAppearanceEnvironment().systemTheme );
};

const bindMenubarWebContentsLogging = (
	webContents : Electron.WebContents ,
	source : MenubarErrorReport['source'] ,
) => {
	if( webContents.isDestroyed() ) return;

	webContents.on( 'console-message' , ( event , ...legacyArgs ) => {
		const {
			level ,
			message ,
			line ,
			sourceId ,
		} = resolveWebContentsConsoleMessage( event , legacyArgs );

		if( level < 2 ) return;
		if( isBenignMenubarConsoleMessage( message ) ) return;

		logMenubarError( {
			scope : 'webContents.console-message' ,
			message ,
			context : JSON.stringify( { line , sourceId , level } ) ,
			source ,
		} );
	} );

	webContents.on( 'render-process-gone' , ( _event , details ) => {
		logMenubarError( {
			scope : 'webContents.render-process-gone' ,
			message : details.reason || 'render-process-gone' ,
			context : JSON.stringify( details ) ,
			source ,
		} );
	} );
};

type ConsoleMessageParams = {
	level : number;
	message : string;
	line : number;
	sourceId : string;
};

const resolveWebContentsConsoleMessage = (
	event : Electron.Event ,
	legacyArgs : unknown[] ,
): ConsoleMessageParams => {
	const eventParams = event as unknown as Partial<ConsoleMessageParams> & {
		lineNumber? : number;
	};
	if( typeof eventParams.message === 'string' && typeof eventParams.level === 'number' ) {
		return {
			level : eventParams.level ,
			message : eventParams.message ,
			line : eventParams.lineNumber ?? eventParams.line ?? 0 ,
			sourceId : eventParams.sourceId ?? '' ,
		};
	}

	const [
		level ,
		message ,
		line ,
		sourceId ,
	] = legacyArgs;
	return {
		level : typeof level === 'number' ? level : 0 ,
		message : typeof message === 'string' ? message : String( message ?? '' ) ,
		line : typeof line === 'number' ? line : 0 ,
		sourceId : typeof sourceId === 'string' ? sourceId : '' ,
	};
};

const isBenignMenubarConsoleMessage = ( message : string ) => {
	return message.includes( 'ipc mtrEvent channel' )
		&& message.includes( 'has no listeners' )
		&& message.includes( 'menu-view:command' );
};


import { reaxel_Menu } from '#main/reaxels/Menu';
import { Reaxel_View } from '#main/reaxels/Views';
import { reaxel_AIViews } from '#main/reaxels/Views/AI-Views';
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import { reaxel_SettingsView } from '#main/reaxels/Views/Settings-View';
import { mainWindow } from '#main/mainWindow';
import { useIpcMainToRenderer , useIpcRendererToMain , useIpcSync } from '#main/services/ipc';
import {
	createDevRendererEntryURL ,
	getFreshRendererLoadURLOptions ,
	getRendererEntryFilePath,
} from '#main/services/dev/renderer-entry';
import { getAIConfigService } from '#main/services/settings/ai-config-service';
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import { reaxel_ElectronENV } from '#generics/reaxels/runtime-paths';
import { getAppearanceEnvironment } from '#main/services/appearance';
import {
	getMenubarErrorLogPath ,
	logMenubarError ,
	toMenubarErrorReport ,
} from '#main/services/menubar-error-log.utility';
import { setMenuShortcutHandlers } from '#main/services/shortcuts/window-keyboard';
import { setMenubarDropdownDismissHandler } from '#main/services/menubar-dropdown-dismiss.utility';
import type { MenubarErrorReport } from '#main/services/menubar-error-log.utility';
import { cloneForIPC } from '#src/shared/utils/clone-for-ipc.utility';
import { getMenuBarHeight as resolveMenuBarHeight } from '#src/shared/menubar-geometry';
import type { MenuView , MainView } from '#src/Types/MenuView';
import type { DropdownView } from '#src/Types/DropdownView';
import type { Settings } from '#src/Types/SettingsTypes';
import type { PromptView } from '#src/Types/PromptView';
import {
	normalizeThemePreference ,
	resolveThemePreference,
} from '#src/shared/appearance';
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
