const { absAppRunningPath } = reaxel_ElectronENV();

export const reaxel_FloatingView = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		floatingView : {
			window : checkAs<BrowserWindow>( null ) ,
			loaded : false ,
			commandQueue : checkAs<FloatingView.Command[]>( [] ),
		},
	} );

	let mainWindowEventsBound = false;
	let switchAiBarLayerActive = false;
	let switchAiBarHideTimer:ReturnType<typeof setTimeout> | null = null;
	const SWITCH_AI_BAR_LAYER_MS = 2100;

	const clearSwitchAiBarHideTimer = () => {
		if( switchAiBarHideTimer ) {
			clearTimeout( switchAiBarHideTimer );
			switchAiBarHideTimer = null;
		}
	};

	const isOverlayLayerActive = () => {
		return switchAiBarLayerActive;
	};

	/** Keep the transparent overlay hidden unless SwitchAiBar is active (macOS occlusion/throttle fix). */
	const syncOverlayLayerVisibility = () => {
		if( isOverlayLayerActive() ) {
			showLayerWindow();
			return;
		}
		hideLayerWindow();
	};

	const armSwitchAiBarLayerAutoHide = () => {
		clearSwitchAiBarHideTimer();
		switchAiBarHideTimer = setTimeout( () => {
			switchAiBarHideTimer = null;
			switchAiBarLayerActive = false;
			if( store.floatingView.loaded ) {
				sendCommandNow( { type : 'switch-ai-bar:hide' } );
			}
			hideLayerWindow();
		} , SWITCH_AI_BAR_LAYER_MS );
	};

	const getFloatingViewBounds = () => {
		return mainWindow.getContentBounds();
	};

	const syncBounds = () => {
		const floatingWindow = store.floatingView.window;
		if( !floatingWindow || floatingWindow.isDestroyed() || mainWindow.isDestroyed() ) {
			return;
		}
		floatingWindow.setBounds( getFloatingViewBounds() , false );
	};

	/* 轻量显示：仅 showInactive()，无 syncBounds/moveTop。
	   syncBounds 由 mainWindow move/resize 事件监听接管；
	   moveTop 不需要——FloatingView 已设置 alwaysOnTop:true + 'floating' 级别，
	   在主窗口上方自动保持层级。
	   用于 SwitchAiBar 显示（每次切换 AI page 调用）。 */
	const showLayerWindow = () => {
		const floatingWindow = store.floatingView.window;
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		if( mainWindow.isVisible() && !mainWindow.isMinimized() ) {
			floatingWindow.showInactive();
		}
	};

	/* 完整置顶：syncBounds + showInactive + moveTop。
	   仅用于窗口从最小化/隐藏恢复时——此时可能有其他应用窗口覆盖。
	   不在每次 AI page 切换时调用，避免 moveTop() OS 级开销。 */
	const bringFloatingViewToTop = () => {
		syncBounds();
		const floatingWindow = store.floatingView.window;
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		if( mainWindow.isVisible() && !mainWindow.isMinimized() ) {
			floatingWindow.showInactive();
			floatingWindow.moveTop();
		}
	};

	const hideLayerWindow = () => {
		const floatingWindow = store.floatingView.window;
		if( floatingWindow && !floatingWindow.isDestroyed() ) {
			floatingWindow.hide();
		}
	};

	const sendCommandNow = (command:FloatingView.Command) => {
		const floatingWindow = store.floatingView.window;
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		useIpcMainToRenderer( 'floating-view-command' ).targets( [ floatingWindow.webContents ] ).send( command );
	};

	const flushCommandQueue = () => {
		if( !store.floatingView.loaded ) {
			return;
		}
		const commands = store.floatingView.commandQueue.slice();
		mutate.floatingView( state => {
			state.commandQueue = [];
		} );
		commands.forEach( sendCommandNow );
	};

	const queueOrSendCommand = (command:FloatingView.Command) => {
		const floatingWindow = initFloatingView();
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		if( command.type === 'switch-ai-bar:hide' ) {
			switchAiBarLayerActive = false;
			clearSwitchAiBarHideTimer();
		}
		if( store.floatingView.loaded ) {
			sendCommandNow( command );
		} else {
			mutate.floatingView( state => {
				state.commandQueue.push( command );
			} );
		}
		syncOverlayLayerVisibility();
	};

	const bindMainWindowEvents = () => {
		if( mainWindowEventsBound ) {
			return;
		}
		mainWindowEventsBound = true;

		mainWindow.on( 'move' , syncBounds );
		mainWindow.on( 'resize' , syncBounds );
		mainWindow.on( 'maximize' , syncBounds );
		mainWindow.on( 'unmaximize' , syncBounds );
		/* restore / show：仅当 overlay 确实需要显示时才置顶，避免 macOS 透明层长期遮挡主窗口。 */
		mainWindow.on( 'restore' , () => {
			if( isOverlayLayerActive() ) {
				bringFloatingViewToTop();
			}
		} );
		mainWindow.on( 'show' , () => {
			if( isOverlayLayerActive() ) {
				bringFloatingViewToTop();
			}
		} );
		mainWindow.on( 'blur' , hideLayerWindow );
		mainWindow.on( 'hide' , hideLayerWindow );
		mainWindow.on( 'minimize' , hideLayerWindow );
		mainWindow.on( 'closed' , () => {
			const floatingWindow = store.floatingView.window;
			if( floatingWindow && !floatingWindow.isDestroyed() ) {
				floatingWindow.close();
			}
		} );
	};

	function initFloatingView() {
		const existingWindow = store.floatingView.window;
		if( existingWindow && !existingWindow.isDestroyed() ) {
			return existingWindow;
		}

		const floatingWindow = new BrowserWindow( {
			parent : mainWindow ,
			show : false ,
			frame : false ,
			transparent : true ,
			backgroundColor : '#00000000' ,
			hasShadow : false ,
			resizable : false ,
			movable : false ,
			minimizable : false ,
			maximizable : false ,
			fullscreenable : false ,
			skipTaskbar : true ,
			focusable : false ,
			acceptFirstMouse : false ,
			alwaysOnTop : true ,
			webPreferences : {
				nodeIntegration : false ,
				contextIsolation : true ,
				backgroundThrottling : false ,
				preload : path.join( absAppRunningPath , 'preload.js' ),
			},
		} );

		/* Windows 上禁止改为 forward:true：Electron 的 mouse forwarding hook 会干扰
		   同应用其它窗口的系统拖动，导致 menubar 抖动、闪烁和粘滞。
		   详见 docs/issues/menubar-drag-investigation.md。 */
		floatingWindow.setIgnoreMouseEvents( true , { forward : false } );
		floatingWindow.setMenu( null );
		floatingWindow.setAlwaysOnTop( true , 'floating' );
		setState.floatingView( {
			window : floatingWindow ,
			loaded : false ,
			commandQueue : [],
		} );
		bindMainWindowEvents();
		syncBounds();

		floatingWindow.on( 'closed' , () => {
			setState.floatingView( {
				window : null ,
				loaded : false ,
				commandQueue : [],
			} );
		} );

		floatingWindow.webContents.once( 'did-finish-load' , () => {
			setState.floatingView( {
				loaded : true,
			} );
			syncBounds();
			flushCommandQueue();
			syncOverlayLayerVisibility();
		} );

		if( dev() ) {
			const url = createDevRendererEntryURL( 'FloatingView' );
			floatingWindow.webContents.loadURL( url , getFreshRendererLoadURLOptions( url ) );
		} else {
			floatingWindow.webContents.loadFile( getRendererEntryFilePath( absAppRunningPath , 'FloatingView' ) );
		}

		return floatingWindow;
	}

	const api = {
		showSwitchAiBar( payload:FloatingView.SwitchAiBarPayload ) {
			switchAiBarLayerActive = true;
			queueOrSendCommand( {
				type : 'switch-ai-bar:show' ,
				payload,
			} );
			armSwitchAiBarLayerAutoHide();
		} ,
		hideSwitchAiBar() {
			switchAiBarLayerActive = false;
			clearSwitchAiBarHideTimer();
			queueOrSendCommand( {
				type : 'switch-ai-bar:hide',
			} );
		} ,
		showGlobalMessage( payload:FloatingView.GlobalMessagePayload ) {
			switchAiBarLayerActive = true;
			queueOrSendCommand( {
				type : 'global-message:show' ,
				payload,
			} );
			clearSwitchAiBarHideTimer();
			const durationMs = Math.max( 500 , ( payload.duration ?? 3 ) * 1000 );
			switchAiBarHideTimer = setTimeout( () => {
				switchAiBarHideTimer = null;
				switchAiBarLayerActive = false;
				hideLayerWindow();
			} , durationMs );
		},
	};

	const rtn = {
		api ,
		initFloatingView ,
		syncBounds,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

import { mainWindow } from '#main/mainWindow';
import {
	createDevRendererEntryURL ,
	getFreshRendererLoadURLOptions ,
	getRendererEntryFilePath,
} from '#main/services/dev/renderer-entry';
import { useIpcMainToRenderer } from '#main/services/ipc';
import { reaxel_ElectronENV } from '#generics/reaxels/runtime-paths';
import type { FloatingView } from '#src/Types/FloatingView';
import {
	BrowserWindow,
} from 'electron';
import { dev } from 'electron-is';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import * as path from 'node:path';
