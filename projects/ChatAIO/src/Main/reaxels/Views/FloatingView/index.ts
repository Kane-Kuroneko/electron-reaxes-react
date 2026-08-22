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

	/*
	 * ── Overlay 呈现调度器 ─────────────────────────────────────────────
	 * desired：switchAiBarLayerActive（SwitchAiBar / GlobalMessage 是否应显示）
	 * actual ：overlayRevealed（逻辑可见）+ overlaySurfaceStale（surface 需重绑）
	 * 唯一调度入口：syncOverlayLayerVisibility → reveal / conceal
	 *
	 * conceal 平台策略（为什么不能统一 hide()/show()）：
	 * - win32『opacity』：透明无框窗反复 hide()→show() 是 Electron 已知坏模式
	 *   （electron#45730 / #40830：isVisible=true、opacity=1 但画面永不出现）；
 *   且若再叠加 backgroundThrottling:false + hide() 易触发 FrameEvictor 失步；
 *   现已恢复默认节流，win32 仍只用 setOpacity conceal。
	 * - darwin『hide』：可见透明层会让主窗被 macOS occlusion 节流（ca15e358c），
	 *   必须真实 hide()；macOS 无上述 Windows 合成器缺陷。
	 * - linux『hide』：setOpacity 在 Linux 不支持。
	 * 见 docs/issues/floating-view-missing-after-background.md
	 */
	const overlayConcealStrategy:'opacity' | 'hide' = process.platform === 'win32' ? 'opacity' : 'hide';
	/** 逻辑可见（opacity 策略下 isVisible() 恒 true，不能作为依据） */
	let overlayRevealed = false;
	/** bounds / alwaysOnTop / z-order / compositor frame 是否可能过期 */
	let overlaySurfaceStale = true;
	let overlayVerifyScheduled = false;

	const clearSwitchAiBarHideTimer = () => {
		if( switchAiBarHideTimer ) {
			clearTimeout( switchAiBarHideTimer );
			switchAiBarHideTimer = null;
		}
	};

	const isOverlayLayerActive = () => {
		return switchAiBarLayerActive;
	};

	/** 调度器唯一入口：desired（layer active）→ reveal / conceal。透明层仅在 SwitchAiBar/GlobalMessage 激活时逻辑可见。 */
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
			syncOverlayLayerVisibility();
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
		if( !floatingWindow || floatingWindow.isDestroyed() || !mainWindow || mainWindow.isDestroyed() ) {
			return;
		}
		if( !hasUsableBrowserWindowContent( mainWindow ) ) {
			return;
		}
		floatingWindow.setBounds( getFloatingViewBounds() , false );
	};

	/**
	 * surface 重绑：bounds / 层级 / z-order / 强制产帧。
	 * stale（conceal 或父窗生命周期扰动）后的 reveal 必须走此路径。
	 * webContents.invalidate() 是关键：帧被驱逐后 showInactive 并不保证
	 * compositor 重新提交帧，必须显式强制 repaint。
	 */
	const rebindOverlaySurface = (floatingWindow:BrowserWindow) => {
		syncBounds();
		floatingWindow.setAlwaysOnTop( true , 'floating' );
		if( !floatingWindow.isVisible() ) {
			floatingWindow.showInactive();
		}
		floatingWindow.moveTop();
		floatingWindow.webContents.invalidate();
		overlaySurfaceStale = false;
	};

	const revealOverlaySurface = (floatingWindow:BrowserWindow) => {
		if( overlaySurfaceStale ) {
			rebindOverlaySurface( floatingWindow );
		} else if( !floatingWindow.isVisible() ) {
			/* 父窗最小化时 OS 会自动隐藏 owned window；恢复后补 show */
			floatingWindow.showInactive();
		}
		if( overlayConcealStrategy === 'opacity' ) {
			floatingWindow.setOpacity( 1 );
		}
		overlayRevealed = true;
		verifyOverlayRevealed( floatingWindow );
	};

	const concealOverlaySurface = (floatingWindow:BrowserWindow) => {
		if( overlayConcealStrategy === 'opacity' ) {
			/* 不 hide()：保持 Chromium 可见性状态，帧不被驱逐、不触发透明窗 re-show 缺陷 */
			floatingWindow.setOpacity( 0 );
		} else {
			floatingWindow.hide();
			/* hide 后 compositor / z-order 不可信，下次 reveal 必须重绑 */
			overlaySurfaceStale = true;
		}
		overlayRevealed = false;
	};

	/**
	 * reveal 后一拍校验：OS 拒绝显示（owned window 激活时序等）时重绑重试一次。
	 * 只校验 OS 可见性；帧层面由 rebind 中的 invalidate 兜底。
	 */
	const verifyOverlayRevealed = (floatingWindow:BrowserWindow) => {
		if( overlayVerifyScheduled ) {
			return;
		}
		overlayVerifyScheduled = true;
		setImmediate( () => {
			overlayVerifyScheduled = false;
			if( floatingWindow.isDestroyed() || !overlayRevealed || !isOverlayLayerActive() ) {
				return;
			}
			if( !floatingWindow.isVisible() ) {
				console.warn( '[FloatingView] overlay reveal rejected by OS; rebinding surface' );
				rebindOverlaySurface( floatingWindow );
				if( overlayConcealStrategy === 'opacity' ) {
					floatingWindow.setOpacity( 1 );
				}
			}
		} );
	};

	const showLayerWindow = (ctxId?:string) => {
		const floatingWindow = store.floatingView.window;
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		if( !mainWindow || mainWindow.isDestroyed() || !( mainWindow.isVisible() && !mainWindow.isMinimized() ) ) {
			return;
		}
		const markCtx = ctxId || activeSwitchPerfCtxId;
		const wasRevealed = overlayRevealed;
		const needsPromote = overlaySurfaceStale || !wasRevealed;
		const isFirstOverlayShow = !hasShownOverlayToUser && !wasRevealed;
		const shouldMark = Boolean( markCtx ) && markCtx !== lastOverlayShowMarkedCtxId;
		if( shouldMark ) {
			lastOverlayShowMarkedCtxId = markCtx;
			perf.mark( PerfPhase.FvShowBegin , 'main' , markCtx , {
				wasVisible : wasRevealed ,
				overlayWasHidden : !wasRevealed ,
				needsPromote ,
				isFirstOverlayShow ,
				platform : process.platform ,
			} );
			if( isFirstOverlayShow ) {
				perf.mark( PerfPhase.FvFirstOverlayShow , 'main' , markCtx , {
					platform : process.platform ,
					wasVisible : wasRevealed ,
					needsPromote ,
				} );
			}
		}
		revealOverlaySurface( floatingWindow );
		if( !wasRevealed ) {
			hasShownOverlayToUser = true;
		}
		if( shouldMark ) {
			perf.mark( PerfPhase.FvShowEnd , 'main' , markCtx , {
				wasVisible : wasRevealed ,
				overlayWasHidden : !wasRevealed ,
				needsPromote ,
				isFirstOverlayShow ,
				isVisibleAfter : floatingWindow.isVisible() ,
				platform : process.platform ,
			} );
		}
	};

	const hideLayerWindow = () => {
		const floatingWindow = store.floatingView.window;
		if( floatingWindow && !floatingWindow.isDestroyed() ) {
			concealOverlaySurface( floatingWindow );
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
		/* restore / show / focus：surface 标记 stale；仅当 overlay 仍应显示时 reveal。
		   禁止 focus 无条件 show——那会让透明层长期遮挡并触发 macOS occlusion 节流。 */
		const onParentPresented = () => {
			overlaySurfaceStale = true;
			if( isOverlayLayerActive() ) {
				showLayerWindow();
			}
		};
		mainWindow.on( 'restore' , onParentPresented );
		mainWindow.on( 'show' , onParentPresented );
		mainWindow.on( 'focus' , onParentPresented );
		/* 父窗失活/隐藏：conceal（win32=opacity 0，darwin/linux=hide）并标记 stale */
		const onParentConcealed = () => {
			overlaySurfaceStale = true;
			hideLayerWindow();
		};
		mainWindow.on( 'blur' , onParentConcealed );
		mainWindow.on( 'hide' , onParentConcealed );
		mainWindow.on( 'minimize' , onParentConcealed );
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
				/* 默认节流；win32 仍用 opacity conceal，不依赖 false+hide 保活 */
				preload : path.join( absAppRunningPath , 'preload.js' ),
			},
		} );

		/* Windows 上禁止改为 forward:true：Electron 的 mouse forwarding hook 会干扰
		   同应用其它窗口的系统拖动，导致 menubar 抖动、闪烁和粘滞。
		   详见 docs/issues/menubar-drag-investigation.md。 */
		floatingWindow.setIgnoreMouseEvents( true , { forward : false } );
		floatingWindow.setMenu( null );
		floatingWindow.setAlwaysOnTop( true , 'floating' );
		if( overlayConcealStrategy === 'opacity' ) {
			/* opacity 模型：窗口显示后长期保持 OS 可见，仅用透明度切换 */
			floatingWindow.setOpacity( 0 );
		}
		overlayRevealed = false;
		overlaySurfaceStale = true;
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
			overlayRevealed = false;
			overlaySurfaceStale = true;
			setState.floatingView( {
				window : null ,
				loaded : false ,
			} );
		} );

		/* 渲染进程崩溃/被杀自愈：reload 后 did-finish-load 会重新 flush 队列并对齐可见性 */
		floatingWindow.webContents.on( 'render-process-gone' , ( _event , details ) => {
			console.warn( '[FloatingView] renderer gone:' , details.reason );
			overlaySurfaceStale = true;
			setState.floatingView( {
				loaded : false,
			} );
			if( !floatingWindow.isDestroyed() ) {
				floatingWindow.webContents.reload();
			}
		} );

		let bootLoadCompleted = false;
		floatingWindow.webContents.on( 'did-finish-load' , () => {
			const isBootLoad = !bootLoadCompleted;
			bootLoadCompleted = true;
			if( isBootLoad ) {
				perf.mark( PerfPhase.FvDidFinishLoad , 'main' , bootPerfCtxId , {
					pendingCommands : pendingCommands.length ,
				} );
			}
			setState.floatingView( {
				loaded : true,
			} );
			syncBounds();
			flushCommandQueue();
			/* 预热透明窗口首次 showInactive，避免第一次真正显示时的合成器冷启动卡顿。 */
			if( isBootLoad && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && !mainWindow.isMinimized() ) {
				perf.mark( PerfPhase.FvWarmupShow , 'main' , bootPerfCtxId );
				if( overlayConcealStrategy === 'opacity' ) {
					/* win32：warmup 后不再 hide()——窗口保持 OS 可见（opacity 0），
					   规避透明窗 hide/show 缺陷与 FrameEvictor 失步（见调度器注释） */
					floatingWindow.setOpacity( 0 );
					floatingWindow.showInactive();
					perf.mark( PerfPhase.FvWarmupHide , 'main' , bootPerfCtxId );
				} else {
					floatingWindow.showInactive();
					perf.mark( PerfPhase.FvWarmupHide , 'main' , bootPerfCtxId );
					floatingWindow.hide();
				}
			}
			syncOverlayLayerVisibility();
			if( isBootLoad ) {
				perf.flush();
			}
		} );

		if( dev() ) {
			void loadDevRendererEntryWithRetry(
				floatingWindow.webContents ,
				'FloatingView' ,
				{} ,
				'FloatingView',
			);
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
				syncOverlayLayerVisibility();
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
	loadDevRendererEntryWithRetry ,
	getRendererEntryFilePath,
} from '#main/services/dev/renderer-entry';
import { useIpcMainToRenderer } from '#main/services/ipc';
import { hasUsableBrowserWindowContent } from '#main/services/usable-window-content.utility';
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
