const { absAppRunningPath } = reaxel_ElectronENV();

export const reaxel_FloatingView = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		floatingView : {
			window : checkAs<BrowserWindow>( null ) ,
			loaded : false ,
		},
	} );

	/* 命令队列放在 reaxable 外：避免 push 进响应式数组后变成 Proxy，IPC 序列化失败。 */
	let pendingCommands : FloatingView.Command[] = [];

	let mainWindowEventsBound = false;
	let switchAiBarLayerActive = false;
	let switchAiBarHideTimer:ReturnType<typeof setTimeout> | null = null;
	const SWITCH_AI_BAR_LAYER_MS = 2100;
	/** 当前切换 ctx：show 路径埋点关联用；无 ctx 时用空串 */
	let activeSwitchPerfCtxId = '';
	/** FloatingView 生命周期 boot ctx（init → load → warmup） */
	let bootPerfCtxId = '';
	/** 同一 ctx 内只记录一次 fv:show-*，避免 queueOrSendCommand 双次 sync 重复打点 */
	let lastOverlayShowMarkedCtxId = '';
	/** overlay 显示期间若有 runtime 列表变化请求，hide 后补一次 prepare */
	let pendingPrepareAfterHide: FloatingView.SwitchAiBarPayload | null = null;
	/** 本进程内是否已对用户做过「hidden→shown」真实展示（冷启动首次调出） */
	let hasShownOverlayToUser = false;

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
	const syncOverlayLayerVisibility = (ctxId?:string) => {
		if( isOverlayLayerActive() ) {
			showLayerWindow( ctxId );
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
			flushPendingPrepareAfterHide();
		} , SWITCH_AI_BAR_LAYER_MS );
	};

	const sendPrepareCommand = (payload:FloatingView.SwitchAiBarPayload) => {
		const prepareCtx = bootPerfCtxId || perf.newBootCtx();
		const fingerprint = switchAiBarItemsFingerprint(
			payload.items ,
			payload.source ?? 'unknown',
		);
		perf.mark( PerfPhase.FvPrepareSent , 'main' , prepareCtx , {
			...fingerprint ,
			activeIndex : payload.activeIndex ,
		} );
		queueOrSendCommand( {
			type : 'switch-ai-bar:prepare' ,
			payload,
		} );
		perf.flush();
	};

	const flushPendingPrepareAfterHide = () => {
		if( !pendingPrepareAfterHide || switchAiBarLayerActive ) {
			return;
		}
		const payload = pendingPrepareAfterHide;
		pendingPrepareAfterHide = null;
		sendPrepareCommand( payload );
	};

	/* 与 AI/Prompt 内容区对齐：从 menubar 下方起算，避免 overlay 视觉遮挡菜单栏。 */
	const getFloatingViewBounds = () => {
		const bounds = mainWindow.getContentBounds();
		const menuBarHeight = getMenuBarHeight();
		return {
			x : bounds.x ,
			y : bounds.y + menuBarHeight ,
			width : bounds.width ,
			height : Math.max( 1 , bounds.height - menuBarHeight ),
		};
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
	const showLayerWindow = (ctxId?:string) => {
		const floatingWindow = store.floatingView.window;
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		if( !( mainWindow.isVisible() && !mainWindow.isMinimized() ) ) {
			return;
		}
		const markCtx = ctxId || activeSwitchPerfCtxId;
		const wasVisible = floatingWindow.isVisible();
		const isFirstOverlayShow = !hasShownOverlayToUser && !wasVisible;
		const shouldMark = Boolean( markCtx ) && markCtx !== lastOverlayShowMarkedCtxId;
		if( shouldMark ) {
			lastOverlayShowMarkedCtxId = markCtx;
			perf.mark( PerfPhase.FvShowBegin , 'main' , markCtx , {
				wasVisible ,
				overlayWasHidden : !wasVisible ,
				isFirstOverlayShow ,
				platform : process.platform ,
			} );
			if( isFirstOverlayShow ) {
				perf.mark( PerfPhase.FvFirstOverlayShow , 'main' , markCtx , {
					platform : process.platform ,
					wasVisible ,
				} );
			}
		}
		floatingWindow.showInactive();
		if( !wasVisible ) {
			hasShownOverlayToUser = true;
		}
		if( shouldMark ) {
			perf.mark( PerfPhase.FvShowEnd , 'main' , markCtx , {
				wasVisible ,
				overlayWasHidden : !wasVisible ,
				isFirstOverlayShow ,
				isVisibleAfter : floatingWindow.isVisible() ,
				platform : process.platform ,
			} );
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
		useIpcMainToRenderer( 'floating-view-command' ).targets( [ floatingWindow.webContents ] ).send(
			cloneForIPC( command ),
		);
	};

	const flushCommandQueue = () => {
		if( !store.floatingView.loaded ) {
			return;
		}
		const commands = pendingCommands.slice();
		pendingCommands = [];
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
		const showCtxId = command.type === 'switch-ai-bar:show'
			? ( command.payload.ctxId || activeSwitchPerfCtxId )
			: activeSwitchPerfCtxId;
		/* show 类命令：先亮起窗口再发 IPC，避免渲染进程在隐藏窗口里跑完 transition 被浏览器吞掉。 */
		const shouldShowLayer = command.type === 'switch-ai-bar:show'
			|| command.type === 'global-message:show';
		if( shouldShowLayer ) {
			syncOverlayLayerVisibility( showCtxId );
		}
		if( store.floatingView.loaded ) {
			sendCommandNow( command );
		} else {
			pendingCommands.push( cloneForIPC( command ) );
		}
		/* prepare 仅预热渲染树，不激活透明层（避免 macOS occlusion）。 */
		if( command.type !== 'switch-ai-bar:prepare' ) {
			syncOverlayLayerVisibility( showCtxId );
		}
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

		bootPerfCtxId = perf.newBootCtx();
		perf.mark( PerfPhase.FvInitStart , 'main' , bootPerfCtxId , {
			platform : process.platform ,
		} );

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
		} );
		bindMainWindowEvents();
		syncBounds();
		perf.mark( PerfPhase.FvInitCreated , 'main' , bootPerfCtxId , {
			platform : process.platform ,
		} );

		floatingWindow.on( 'closed' , () => {
			pendingCommands = [];
			setState.floatingView( {
				window : null ,
				loaded : false ,
			} );
		} );

		floatingWindow.webContents.once( 'did-finish-load' , () => {
			perf.mark( PerfPhase.FvDidFinishLoad , 'main' , bootPerfCtxId , {
				pendingCommands : pendingCommands.length ,
			} );
			setState.floatingView( {
				loaded : true,
			} );
			syncBounds();
			flushCommandQueue();
			/* 预热透明窗口首次 showInactive，避免第一次真正显示时的合成器冷启动卡顿。
			   立即 hide，不长期遮挡主窗口（macOS occlusion/throttle 约束仍成立）。 */
			if( mainWindow.isVisible() && !mainWindow.isMinimized() ) {
				perf.mark( PerfPhase.FvWarmupShow , 'main' , bootPerfCtxId );
				floatingWindow.showInactive();
				perf.mark( PerfPhase.FvWarmupHide , 'main' , bootPerfCtxId );
				floatingWindow.hide();
			}
			syncOverlayLayerVisibility();
			perf.flush();
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
		/** 启动预热：写入卡片数据并挂载 Swiper，但不显示 overlay。 */
		prepareSwitchAiBar( payload:FloatingView.SwitchAiBarPayload ) {
			sendPrepareCommand( payload );
		} ,
		/**
		 * overlay 正在显示时跳过：避免打断动画；用于 runtime 列表变化后的静默对齐。
		 * 跳过时挂起 payload，等 layer hide 后补发。
		 * @returns 是否已立即发送 prepare
		 */
		prepareSwitchAiBarIfHidden( payload:FloatingView.SwitchAiBarPayload ) {
			if( switchAiBarLayerActive ) {
				pendingPrepareAfterHide = payload;
				return false;
			}
			sendPrepareCommand( payload );
			return true;
		} ,
		isSwitchAiBarLayerActive() {
			return switchAiBarLayerActive;
		} ,
		showSwitchAiBar( payload:FloatingView.SwitchAiBarPayload ) {
			activeSwitchPerfCtxId = payload.ctxId || '';
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
			flushPendingPrepareAfterHide();
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
				flushPendingPrepareAfterHide();
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
import { getMenuBarHeight } from '#src/shared/menubar-geometry';
import { cloneForIPC } from '#src/shared/utils/clone-for-ipc.utility';
import {
	perf ,
	PerfPhase ,
	switchAiBarItemsFingerprint,
} from '#src/shared/utils/switch-perf-recorder.utility';
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
