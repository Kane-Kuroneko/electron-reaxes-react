export const Reaxel_View = reaxel( () => {
	const electronStore = new ElectronStore<{
		previously_used_ai: string,
	}>( { name : "previously-used-ai" } );
	const previouslyUsedAI = electronStore.get( "previously_used_ai" ) || "";
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		currentAIViewKey : previouslyUsedAI ,
		settingsViewOpened : false,
	} );

	function fitWindow(target?:string) {
		clipMainShellToMenuBar( mainWindow );
		const { width , height } = mainWindow.getContentBounds();
		const centerBounds = getCenterBounds( { x : 0 , y : 0 , width , height } );
		const viewSetBounds = (view:WebContentsView) => setViewBoundsIfChanged( view , centerBounds );

		if( target ) {
			const runtimeView = reaxel_AIViews.store.AIViews.find( item => item.id === target );
			viewSetBounds( runtimeView?.view );
			reaxel_PromptViews().syncBounds( { x : 0 , y : 0 , width , height } );
			return;
		}
		reaxel_AIViews.store.AIViews.forEach( runtimeView => {
			viewSetBounds( runtimeView.view );
		} );
		viewSetBounds( reaxel_SettingsView.store.settingsView.view );
		reaxel_PromptViews().syncBounds( { x : 0 , y : 0 , width , height } );
	}

	function fitContentView(view?:WebContentsView | null) {
		setViewBoundsIfChanged( view , getCenterBounds() );
	}

	function fitCurrentCenterView(bounds:Rectangle) {
		const view = getCurrentCenterView();
		if( !view || view.webContents.isDestroyed() ) {
			return;
		}
		if( process.platform === 'darwin' && view.getVisible() ) {
			view.setBounds( bounds );
			return;
		}
		setViewBoundsIfChanged( view , bounds );
	}

	function getAllCenterViews() {
		const views = reaxel_AIViews.store.AIViews.map( runtimeView => runtimeView.view );
		const settingsView = reaxel_SettingsView.store.settingsView.view;
		if( settingsView ) {
			views.push( settingsView );
		}
		return views.filter( Boolean );
	}

	/**
	 * 中心 WebContentsView 生命周期 —— 单一所有者模型
	 * （docs/issues/ai-view-foreground-white-flash.md）
	 *
	 * 角色拆分：
	 * - reaxel_AIViews.applyVisibility：只 detach「不该在中心区的 AI」
	 * - Reaxel_View.presentActiveCenterView：唯一 mount/promote 入口
	 *
	 * 两种意图（禁止 reason 字符串矩阵）：
	 * - switch：AI / Settings / 冷启动 —— 允许平台级 remount/reorder
	 * - recover：focus / show / restore —— 只补挂载与可见性，禁止 remount/reorder/nudge
	 *
	 * hierarchy（attached∧visible）与 layout（bounds）分离：
	 * 回前台 bounds 过期只 setBounds，绝不升级为 switch remount。
	 */

	/** Detach：闲置中心 view 离开 hit-test（electron#51176）与 macOS WasShown 前置。 */
	function safeDetachWebContentsView(view:WebContentsView | null | undefined) {
		if( !view || view.webContents.isDestroyed() ) {
			return;
		}
		if( view.getVisible() ) {
			view.setVisible( false );
		}
		try {
			mainWindow.contentView.removeChildView( view );
		} catch {
			/* already detached */
		}
	}

	function detachInactiveCenterView(view:WebContentsView | null | undefined) {
		safeDetachWebContentsView( view );
	}

	function isCenterViewAttached(view:WebContentsView | null | undefined) {
		if( !view || view.webContents.isDestroyed() || mainWindow.isDestroyed() ) {
			return false;
		}
		try {
			return mainWindow.contentView.children.includes( view );
		} catch {
			return false;
		}
	}

	/** 层级健康：已在 contentView 且可见。不含 bounds。 */
	function isCenterViewHierarchyReady(view:WebContentsView | null | undefined) {
		return Boolean(
			view
			&& !view.webContents.isDestroyed()
			&& isCenterViewAttached( view )
			&& view.getVisible(),
		);
	}

	function detachOtherCenterViews(activeView:WebContentsView | null) {
		getAllCenterViews().forEach( view => {
			if( !view || view === activeView ) {
				return;
			}
			detachInactiveCenterView( view );
		} );
	}

	/**
	 * switch：内容换页。Darwin remove+add 触发 WasShown（唯一 compositor 手段）；
	 * Win/Linux 一律 addChildView（未挂载则挂上，已挂载则置顶）。
	 * 禁止 bounds±1，禁止二次 addChildView。
	 */
	function mountCenterViewForSwitch(view:WebContentsView , bounds:Rectangle) {
		if( process.platform === 'darwin' && isCenterViewAttached( view ) ) {
			try {
				mainWindow.contentView.removeChildView( view );
			} catch {
				/* already detached */
			}
		}
		mainWindow.contentView.addChildView( view );
		view.setBounds( bounds );
		view.setVisible( true );
	}

	/**
	 * recover：hierarchy 破损时补挂。已挂载则绝不 addChildView（避免 reorder 闪白）。
	 */
	function mountCenterViewForRecover(view:WebContentsView , bounds:Rectangle) {
		if( !isCenterViewAttached( view ) ) {
			mainWindow.contentView.addChildView( view );
		}
		setViewBoundsIfChanged( view , bounds );
		if( !view.getVisible() ) {
			view.setVisible( true );
		}
	}

	/**
	 * mobx reaction（obsReaction 底层）在 setState 的 action 结束时**同步**执行，
	 * 早于 setState 之后的语句。命令式切换路径（setState → applyVisibility →
	 * present('switch')）若不抑制下方 store 兜底 reaction，会先被兜底 remount 一次、
	 * 再被显式调用 remount 一次——darwin 上即每次切换双重 remove+add，
	 * Win/Linux 上是二次 addChildView reorder（本文件明令禁止）。
	 * 调用本入口 = 承诺 setState 返回后**同步**自行 present('switch')。
	 */
	let imperativeCenterSwitchInProgress = false;
	function setCenterStateForImperativeSwitch(patch:{
		currentAIViewKey:string;
		settingsViewOpened:boolean;
	}) {
		imperativeCenterSwitchInProgress = true;
		try {
			setState( patch );
		} finally {
			imperativeCenterSwitchInProgress = false;
		}
	}

	/**
	 * 唯一 present 入口。AI 切换路径必须在 FloatingView showInactive **之前**同步调用 switch。
	 */
	function presentActiveCenterView(
		intent:CenterMountIntent ,
		bounds = getCenterBounds(),
	) {
		const activeView = getCurrentCenterView();
		detachOtherCenterViews( activeView );
		if( !activeView || activeView.webContents.isDestroyed() ) {
			return;
		}
		if( intent === 'switch' ) {
			mountCenterViewForSwitch( activeView , bounds );
		} else {
			mountCenterViewForRecover( activeView , bounds );
		}
		restoreActiveCenterViewFocus( intent );
	}

	/** L0：Alt-Tab / 点击回焦 —— hierarchy 完好则只还焦点。 */
	function recoverActiveCenterViewAfterFocus() {
		const activeView = getCurrentCenterView();
		if( !activeView || activeView.webContents.isDestroyed() ) {
			return;
		}
		if( !isCenterViewHierarchyReady( activeView ) ) {
			presentActiveCenterView( 'recover' );
			return;
		}
		restoreActiveCenterViewFocus( 'recover' );
	}

	/**
	 * L1：show / restore —— hierarchy 与 layout 拆开处理。
	 * layout 过期只 setBounds；hierarchy 破损才 recover mount。
	 */
	function softRecoverActiveCenterView() {
		const bounds = getCenterBounds();
		const activeView = getCurrentCenterView();
		if( !activeView || activeView.webContents.isDestroyed() ) {
			return;
		}
		if( !isCenterViewHierarchyReady( activeView ) ) {
			presentActiveCenterView( 'recover' , bounds );
			return;
		}
		setViewBoundsIfChanged( activeView , bounds );
		restoreActiveCenterViewFocus( 'recover' );
	}

	function getCenterBounds(bounds = mainWindow.getContentBounds()):Rectangle {
		const promptInsets = reaxel_PromptViews().getLayoutInsets();
		const menuBarHeight = getMenuBarHeight();
		return {
			x : promptInsets.left ,
			y : menuBarHeight ,
			width : Math.max( 1 , bounds.width - promptInsets.left - promptInsets.right ) ,
			height : Math.max( 1 , bounds.height - menuBarHeight ),
		};
	}

	function setViewBoundsIfChanged(view:WebContentsView | null | undefined , bounds:Rectangle) {
		if( !view || view.webContents.isDestroyed() ) {
			return;
		}
		if( isSameBounds( view.getBounds() , bounds ) ) {
			return;
		}
		view.setBounds( bounds );
	}

	function focusCurrentContentView() {
		mainWindow.focus();
		focusCenterWebContents();
	}

	/** 仅聚焦中心内容 WebContents（不碰 BrowserWindow），供窗口 focus 恢复使用。 */
	function focusCenterWebContents() {
		const view = getCurrentCenterView();
		if( !view || view.webContents.isDestroyed() ) {
			return;
		}
		/* FocusMonitor: 通过 safeFocusViewWithMonitor 包装 focus() 调用 */
		try {
			safeFocusViewWithMonitor( view , 'focus-current-content-view' );
		} catch {
			view.webContents.focus();
		}
	}

	/**
	 * 主窗口从其它应用切回后，Electron 常把焦点还给 mainWindow.webContents（menubar 壳），
	 * 而不是 AI/Settings WebContentsView，导致输入框失焦（electron#28163）。
	 * 在 focus 事件后延迟一拍，把焦点还回中心内容区；若 Prompt 侧栏已持有焦点则不抢。
	 */
	function restoreActiveCenterViewFocus(intent:CenterMountIntent = 'recover') {
		setImmediate( () => {
			if( !mainWindow || mainWindow.isDestroyed() || !mainWindow.isFocused() ) {
				return;
			}
			const focusedWindow = BrowserWindow.getFocusedWindow();
			if( focusedWindow && focusedWindow !== mainWindow ) {
				return;
			}
			const promptStore = reaxel_PromptViews.store;
			for( const side of [ 'left' , 'right' ] as const ) {
				const promptView = promptStore[side]?.view;
				if(
					promptView
					&& !promptView.webContents.isDestroyed()
					&& promptView.webContents.isFocused()
				) {
					return;
				}
			}
			const view = getCurrentCenterView();
			if( !view || view.webContents.isDestroyed() ) {
				return;
			}
			if( view.webContents.isFocused() ) {
				return;
			}
			const focusSource:FocusMonitorFocusSource = intent === 'recover'
				? 'window-restore-paint'
				: 'apply-visibility';
			try {
				safeFocusViewWithMonitor( view , focusSource );
			} catch {
				view.webContents.focus();
			}
		} );
	}

	function getCurrentCenterView() {
		if( store.settingsViewOpened ) {
			return reaxel_SettingsView.store.settingsView.view;
		}
		return reaxel_AIViews().currentAIView?.view || null;
	}

	async function onReadyLoadAIView() {
		const settings = getRuntimeSettings();
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		const targetAI = resolveStartupAI( activeAIs , settings , store.currentAIViewKey );

		if( targetAI ) {
			setState( { currentAIViewKey : targetAI.id } );
			await reaxel_AIViews().syncAIViewsWithConfig( settings );
		}
	}

	const getWrappedIndex = (index:number , length:number) => {
		return ( index + length ) % length;
	};

	/* 构造 SwitchAiBar 显示载荷。
	   items 为全部活跃 AI（保持用户顺序），activeIndex 为当前 AI 的索引，
	   direction 告知组件滑动方向以保证"向前=卡片永远向左"的契约。
	   Swiper 以 items 为稳定 slide 列表，通过 slideNext/slidePrev 驱动方向正确的过渡。 */
	const createSwitchAiBarPayload = (
		items:SwitchAiBarPayloadItem[] ,
		activeIndex:number ,
		direction:FloatingView.SwitchAiBarDirection ,
		ctxId?: string ,
		source:FloatingView.SwitchAiBarPayload['source'] = 'unknown',
	):FloatingView.SwitchAiBarPayload => {
		return {
			items : items.map( ( { id , label , family } ) => ( { id , label , family } ) ) ,
			activeIndex ,
			direction ,
			ctxId ,
			source ,
		};
	};

	const showSwitchAiBarAfterSwitch = (payload:FloatingView.SwitchAiBarPayload) => {
		const show = () => {
			reaxel_FloatingView().api.showSwitchAiBar( payload );
		};
		/* macOS: defer overlay until center WCV remount finishes (FloatingView showInactive can stall compositor). */
		if( process.platform === 'darwin' ) {
			setImmediate( show );
			return;
		}
		show();
	};

	/** 与 menubar Prev/Next（instantiated）同源预热，避免首次 show 时 items.length 变化触发 Swiper 重建。 */
	const prepareInstantiatedSwitchAiBar = (opts?:{ silent?: boolean }) => {
		const settings = getRuntimeSettings();
		const runtimeViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		if( runtimeViews.length === 0 ) {
			return;
		}
		const currentIndex = runtimeViews.findIndex( rv => rv.id === store.currentAIViewKey );
		const payload = createSwitchAiBarPayload(
			runtimeViews.map( createPayloadItemFromRuntimeView ) ,
			currentIndex >= 0 ? currentIndex : 0 ,
			'next' ,
			undefined ,
			'prepare-instantiated',
		);
		if( opts?.silent ) {
			reaxel_FloatingView().api.prepareSwitchAiBarIfHidden( payload );
			return;
		}
		reaxel_FloatingView().api.prepareSwitchAiBar( payload );
	};

	const turnToAiPageByOffset = (
		offset:number ,
		direction:FloatingView.SwitchAiBarDirection,
	) => {
		if( shouldIgnoreDuplicateSwitch( direction ) ) {
			return null;
		}
		const settings = getRuntimeSettings();
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		if( activeAIs.length === 0 ) {
			reaxel_FloatingView().api.hideSwitchAiBar();
			return null;
		}

		const currentIndex = activeAIs.findIndex( ai => ai.id === store.currentAIViewKey );
		const baseIndex = currentIndex === -1
			? offset > 0 ? -1 : 0
			: currentIndex;
		const nextIndex = getWrappedIndex( baseIndex + offset , activeAIs.length );
		const nextAI = activeAIs[nextIndex];
		/* 性能记录 */
		const ctxId = perf.newCtx();
		const { isFirstSwitchInSession , switchOrdinal } = perf.beginSwitchInSession();
		perf.mark( PerfPhase.SwitchStart , 'main' , ctxId , {
			action : 'switch-configured' ,
			offset ,
			direction ,
			viewCount : activeAIs.length ,
			isFirstSwitchInSession ,
			switchOrdinal ,
		} );

		perf.mark( PerfPhase.SwitchAiViewBegin , 'main' , ctxId , {
			aiId : nextAI.id ,
			isFirstSwitchInSession ,
		} );
		const view = reaxel_AIViews().showAIView( nextAI.id , settings );
		perf.mark( PerfPhase.SwitchAiViewEnd , 'main' , ctxId , {
			aiId : nextAI.id ,
		} );

		showSwitchAiBarAfterSwitch(
			createSwitchAiBarPayload(
				activeAIs.map( createPayloadItemFromAI ) ,
				nextIndex ,
				direction ,
				ctxId ,
				'configured',
			),
		);

		perf.mark( PerfPhase.SwitchIpcSent , 'main' , ctxId , {
			action : 'switch-configured' ,
			activeIndex : nextIndex ,
			isFirstSwitchInSession ,
		} );
		perf.flush();

		return view;
	};

	const turnToInstantiatedAiPageByOffset = (
		offset:number ,
		direction:FloatingView.SwitchAiBarDirection,
	) => {
		if( shouldIgnoreDuplicateSwitch( `instantiated:${ direction }` ) ) {
			return null;
		}
		const settings = getRuntimeSettings();
		const runtimeViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		if( runtimeViews.length === 0 ) {
			reaxel_FloatingView().api.hideSwitchAiBar();
			return null;
		}

		const currentIndex = runtimeViews.findIndex( runtimeView => runtimeView.id === store.currentAIViewKey );
		const baseIndex = currentIndex === -1
			? offset > 0 ? -1 : 0
			: currentIndex;
		const nextIndex = getWrappedIndex( baseIndex + offset , runtimeViews.length );
		const nextRuntimeView = runtimeViews[nextIndex];

		/* 性能记录 */
		const ctxId = perf.newCtx();
		const { isFirstSwitchInSession , switchOrdinal } = perf.beginSwitchInSession();
		perf.mark( PerfPhase.SwitchStart , 'main' , ctxId , {
			action : 'switch-instantiated' ,
			direction ,
			viewCount : runtimeViews.length ,
			isFirstSwitchInSession ,
			switchOrdinal ,
		} );

		perf.mark( PerfPhase.SwitchAiViewBegin , 'main' , ctxId , {
			aiId : nextRuntimeView.id ,
			isFirstSwitchInSession ,
		} );
		setCenterStateForImperativeSwitch( {
			currentAIViewKey : nextRuntimeView.id ,
			settingsViewOpened : false,
		} );
		reaxel_AIViews().applyVisibility();
		presentActiveCenterView( 'switch' );
		perf.mark( PerfPhase.SwitchAiViewEnd , 'main' , ctxId , {
			aiId : nextRuntimeView.id ,
		} );

		showSwitchAiBarAfterSwitch(
			createSwitchAiBarPayload(
				runtimeViews.map( createPayloadItemFromRuntimeView ) ,
				nextIndex ,
				direction ,
				ctxId ,
				'instantiated',
			),
		);

		perf.mark( PerfPhase.SwitchIpcSent , 'main' , ctxId , {
			action : 'switch-instantiated' ,
			activeIndex : nextIndex ,
			isFirstSwitchInSession ,
		} );
		perf.flush();

		return nextRuntimeView.view;
	};

	const turnToNextAiPage = () => {
		return turnToAiPageByOffset( 1 , 'next' );
	};

	const turnToPreviousAiPage = () => {
		return turnToAiPageByOffset( -1 , 'previous' );
	};

	const turnToNextInstantiatedAiPage = () => {
		return turnToInstantiatedAiPageByOffset( 1 , 'next' );
	};

	const turnToPreviousInstantiatedAiPage = () => {
		return turnToInstantiatedAiPageByOffset( -1 , 'previous' );
	};

	const closeCurrentAIView = () => {
		const settings = getRuntimeSettings();
		const runtimeViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		const currentRuntimeView = runtimeViews.find( runtimeView => runtimeView.id === store.currentAIViewKey );

		/* 性能记录：关闭开始 */
		const ctxId = perf.newCtx();
		const { isFirstSwitchInSession , switchOrdinal } = perf.beginSwitchInSession();
		perf.mark( PerfPhase.SwitchStart , 'main' , ctxId , {
			action : 'close' ,
			currentId : currentRuntimeView?.id ,
			viewCount : runtimeViews.length ,
			isFirstSwitchInSession ,
			switchOrdinal ,
		} );

		perf.mark( PerfPhase.SwitchAiViewBegin , 'main' , ctxId , {
			action : 'close' ,
		} );
		const result = reaxel_AIViews().closeCurrentAIViewAndShowNext( settings );
		perf.mark( PerfPhase.SwitchAiViewEnd , 'main' , ctxId , {
			action : 'close' ,
			closed : Boolean( result ),
		} );

		if( result ) {
			/* 关闭成功后，向 FloatingView 发送更新后的卡片载荷。
			   Ctrl+W 销毁了当前 AI View，需同步刷新 SwitchAiBar 的 items 和 activeIndex。 */
			const updatedRuntimeViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );

			if( updatedRuntimeViews.length > 0 ) {
				const nextIndex = updatedRuntimeViews.findIndex(
					rv => rv.id === store.currentAIViewKey,
				);

				reaxel_FloatingView().api.showSwitchAiBar(
					createSwitchAiBarPayload(
						updatedRuntimeViews.map( createPayloadItemFromRuntimeView ) ,
						nextIndex >= 0 ? nextIndex : 0 ,
						'next' ,
						ctxId ,
						'instantiated',
					),
				);

				perf.mark( PerfPhase.SwitchIpcSent , 'main' , ctxId , {
					action : 'close' ,
					itemCount : updatedRuntimeViews.length ,
					activeIndex : nextIndex ,
					isFirstSwitchInSession ,
				} );
			} else {
				reaxel_FloatingView().api.hideSwitchAiBar();

				perf.mark( PerfPhase.SwitchIpcSent , 'main' , ctxId , {
					action : 'close' ,
					itemCount : 0 ,
					activeIndex : -1 ,
					isFirstSwitchInSession ,
				} );
				prepareInstantiatedSwitchAiBar( { silent : true } );
			}

		}
		perf.flush();
		return result;
	};

	let lastSwitchAt = 0;
	let lastSwitchDirection:string | null = null;

	/* 仅在「未被忽略」时刷新时间戳：若无条件刷新，<40ms 间隔的连续事件流
	   （如键盘自动重复）会不断自我续期，导致长按快捷键完全无法连续切换。 */
	const shouldIgnoreDuplicateSwitch = (direction:string) => {
		const now = Date.now();
		const duplicate = direction === lastSwitchDirection && now - lastSwitchAt < 40;
		if( !duplicate ) {
			lastSwitchAt = now;
			lastSwitchDirection = direction;
		}
		return duplicate;
	};

	let runtimeViewsInitialized = false;

	const initRuntimeViews = async() => {
		if( runtimeViewsInitialized ) return;
		runtimeViewsInitialized = true;
		/* menubar 宿主（IPC/attach）由 runtime Phase 0–2 负责，此处只初始化内容区 views。 */
		setAISwitchShortcutHandlers( {
			nextConfigured : () => {
				turnToNextAiPage();
			} ,
			previousConfigured : () => {
				turnToPreviousAiPage();
			} ,
			nextInstantiated : () => {
				turnToNextInstantiatedAiPage();
			} ,
			previousInstantiated : () => {
				turnToPreviousInstantiatedAiPage();
			} ,
			closeCurrent : () => {
				closeCurrentAIView();
			},
			nextInstantiatedTab : () => {
				turnToNextInstantiatedAiPage();
			} ,
			previousInstantiatedTab : () => {
				turnToPreviousInstantiatedAiPage();
			},
		} );
		registerAISwitchGlobalShortcuts();
		reaxel_FloatingView().initFloatingView();
		reaxel_PromptViews().registerIpc();
		await onReadyLoadAIView();
		presentActiveCenterView( 'switch' );
		/* AI 列表就绪后预热 SwitchAiBar：与 menubar Prev/Next 同源（instantiated），避免首次显示重建。 */
		prepareInstantiatedSwitchAiBar();
		mainWindow.on( 'resize' , () => {
			fitWindow();
		} );
		mainWindow.on( 'focus' , () => {
			registerAISwitchGlobalShortcuts();
			recoverActiveCenterViewAfterFocus();
		} );
		mainWindow.on( 'show' , () => {
			registerAISwitchGlobalShortcuts();
			softRecoverActiveCenterView();
		} );
		mainWindow.on( 'restore' , () => {
			registerAISwitchGlobalShortcuts();
			softRecoverActiveCenterView();
		} );
		mainWindow.on( 'blur' , unregisterAISwitchGlobalShortcuts );
		mainWindow.on( 'hide' , unregisterAISwitchGlobalShortcuts );
		mainWindow.on( 'minimize' , unregisterAISwitchGlobalShortcuts );
		mainWindow.on( 'closed' , unregisterAISwitchGlobalShortcuts );

		useIpcRendererToMain( 'update-preload-ai-config' ).on( async() => {
			await reaxel_AIViews().syncAIViewsWithConfig( getRuntimeSettings() );
			prepareInstantiatedSwitchAiBar( { silent : true } );
		} );

		useIpcRendererToMain( 'turn-to-next-ai-page' ).on( () => {
			void turnToNextAiPage();
		} );

		useIpcRendererToMain( 'turn-to-previous-ai-page' ).on( () => {
			void turnToPreviousAiPage();
		} );
	};

	obsReaction( ( first ) => {
		if( first ) return;
		if( store.currentAIViewKey ) {
			electronStore.set( "previously_used_ai" , store.currentAIViewKey );
		}
	} , () => [ store.currentAIViewKey ] );

	/* runtime AI 列表变化时静默对齐 SwitchAiBar（仅 overlay 隐藏时），避免下次显示时重建。 */
	obsReaction( ( first ) => {
		if( first ) return;
		prepareInstantiatedSwitchAiBar( { silent : true } );
	} , () => [ reaxel_AIViews.store.AIViews.length ] );

	/**
	 * store 变化兜底（Settings 开/关只 setState 的路径）：
	 * applyVisibility 只 detach；present 由本处或同步切换路径负责。
	 * 注意：本 reaction 在 setState 内部**同步**触发（mobx action 结束时），
	 * 早于调用方 setState 之后的显式 present。命令式切换路径通过
	 * setCenterStateForImperativeSwitch 置位抑制标志，由调用方自行 present('switch')，
	 * 否则会双重 remount（见该函数注释）。
	 */
	obsReaction( ( first ) => {
		if( first ) return;
		if( imperativeCenterSwitchInProgress ) return;

		fitCurrentCenterView( getCenterBounds() );
		reaxel_AIViews().applyVisibility();

		if( store.settingsViewOpened ) {
			presentActiveCenterView( 'switch' );
			return;
		}

		const view = getCurrentCenterView();
		if( !isCenterViewHierarchyReady( view ) ) {
			presentActiveCenterView( 'switch' );
		}
	} , () => [
		store.settingsViewOpened ,
		store.currentAIViewKey,
	] );

	const rtn = {
		initRuntimeViews ,
		fitWindow,
		fitContentView ,
		fitCurrentCenterView ,
		focusCurrentContentView ,
		detachInactiveCenterView ,
		presentActiveCenterView ,
		setCenterStateForImperativeSwitch ,
		turnToNextAiPage ,
		turnToPreviousAiPage ,
		turnToNextInstantiatedAiPage ,
		turnToPreviousInstantiatedAiPage ,
		closeCurrentAIView,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const getRuntimeSettings = ():Settings => {
	const settingsConfigService = getSettingsConfigService();
	const aiConfigService = getAIConfigService();
	return {
		...settingsConfigService.getEffectiveSettings() ,
		AIs : aiConfigService.getEffectiveAIs(),
	};
};

const createPayloadItemFromAI = (ai:AI.AIItem):SwitchAiBarPayloadItem => {
	return {
		id : ai.id ,
		label : ai.label ,
		family : ai.AI_family,
	};
};

const createPayloadItemFromRuntimeView = (runtimeView:RuntimeAIView):SwitchAiBarPayloadItem => {
	return {
		id : runtimeView.id ,
		label : runtimeView.label ,
		family : runtimeView.AIName,
	};
};

const isSameBounds = (left:Rectangle , right:Rectangle) => {
	return left.x === right.x
		&& left.y === right.y
		&& left.width === right.width
		&& left.height === right.height;
};

/** switch = 换页/Settings/冷启动；recover = 回前台补挂载（禁止 remount）。 */
export type CenterMountIntent = 'switch' | 'recover';

type SwitchAiBarPayloadItem = {
	id: string;
	label: string;
	family: AI.AIFamily;
};

const resolveStartupAI = (
	activeAIs:AI.AIItem[] ,
	settings:Settings ,
	currentAIViewKey:string,
) => {
	if( activeAIs.length === 0 ) {
		return null;
	}
	if( settings.startup.aiPageLoadMode === 'first-ai' ) {
		return activeAIs[0];
	}
	return activeAIs.find( ai => ai.id === currentAIViewKey )
		|| activeAIs.find( ai => ai.AI_family === currentAIViewKey )
		|| activeAIs[0];
};

/* ==========================================
   菜单栏高度常量（单一数据源：shared/menubar-geometry）
   ========================================== */
const getMenuBarHeight = () => resolveMenuBarHeight();

import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import {
	BrowserWindow ,
	type Rectangle ,
	WebContentsView,
} from "electron";
import { getMenuBarHeight as resolveMenuBarHeight } from '#src/shared/menubar-geometry';
import { clipMainShellToMenuBar } from '#main/services/clip-main-shell-to-menubar.utility';
import ElectronStore from "electron-store";
import { mainWindow } from "#main/mainWindow";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
import {
	type FocusMonitorFocusSource ,
	safeFocusViewWithMonitor,
} from "#main/reaxels/Views/AI-Views";
import {
	reaxel_FloatingView ,
} from "#main/reaxels/Views/FloatingView";
import { reaxel_I18n } from "#main/reaxels/I18n";
import { useIpcRendererToMain } from "#main/services/ipc";
import {
	registerAISwitchGlobalShortcuts ,
	setAISwitchShortcutHandlers ,
	unregisterAISwitchGlobalShortcuts,
} from '#main/services/shortcuts/ai-switch';
import { getAIConfigService } from "#main/services/settings/ai-config-service";
import { getSettingsConfigService } from "#main/services/settings/settings-config-service";
import type { FloatingView } from "#src/Types/FloatingView";
import type { AI } from "#src/Types/SettingsTypes/AI";
import type { Settings } from "#src/Types/SettingsTypes";
import type { RuntimeAIView } from "#main/reaxels/Views/AI-Views";
import { perf , PerfPhase } from '#src/shared/utils/switch-perf-recorder.utility';
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from "reaxes";
