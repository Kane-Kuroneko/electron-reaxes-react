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
		if( isWebContentsViewDead( view ) ) {
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
	 *
	 * 内容 WebContents 使用默认 backgroundThrottling（true），走正常 WasHidden/WasShown，
	 * 回前台 hierarchy 完好时只 focus / 对齐 bounds——禁止 ±1 / invalidate 踢绘（会闪）。
	 */

	/** 监控不得抛穿业务调度。 */
	function safeSchedule(fn: () => void) {
		try {
			fn();
		} catch { /* 监控不得中断调度 */ }
	}

	/** Detach：闲置中心 view 离开 hit-test（electron#51176）与 macOS WasShown 前置。 */
	function safeDetachWebContentsView(view:WebContentsView | null | undefined) {
		if( isWebContentsViewDead( view ) ) {
			return;
		}
		const mon = centerScheduleMonitor;
		const tracing = mon.enabled && Boolean( mon.activeChainId );
		const viewId = tracing ? mon.getViewId( view ) : '';
		const wasAttached = isCenterViewAttached( view );
		if( view.getVisible() ) {
			view.setVisible( false );
			if( tracing ) {
				safeSchedule( () => {
					mon.note( {
						op: 'set-visible' ,
						phase: 'action' ,
						decision: 'detach→visible-false' ,
						viewId ,
						detail: { visible: false } ,
					} );
				} );
			}
		}
		try {
			mainWindow.contentView.removeChildView( view );
			if( tracing ) {
				safeSchedule( () => {
					mon.note( {
						op: 'detach' ,
						phase: 'action' ,
						decision: wasAttached ? 'removeChildView' : 'removeChildView-already-detached' ,
						viewId ,
					} );
				} );
			}
		} catch {
			if( tracing ) {
				safeSchedule( () => {
					mon.note( {
						op: 'detach' ,
						phase: 'action' ,
						decision: 'removeChildView-throw-already-detached' ,
						viewId ,
					} );
				} );
			}
		}
	}

	function detachInactiveCenterView(view:WebContentsView | null | undefined) {
		safeDetachWebContentsView( view );
	}

	/**
	 * 预加载暖机：保持挂在 contentView 上但不可见，让 load/首帧有机会在 hierarchy 内完成。
	 * 禁止用于已首展过的闲置页（那些走硬 detach）。
	 */
	function softHideInactiveCenterView(view:WebContentsView | null | undefined) {
		if( isWebContentsViewDead( view ) ) {
			return;
		}
		const mon = centerScheduleMonitor;
		const tracing = mon.enabled && Boolean( mon.activeChainId );
		const viewId = tracing ? mon.getViewId( view ) : '';
		if( !isCenterViewAttached( view ) ) {
			try {
				mainWindow.contentView.addChildView( view );
				fitContentView( view );
				if( tracing ) {
					safeSchedule( () => {
						mon.note( {
							op: 'mount-recover' ,
							phase: 'action' ,
							decision: 'soft-hide→reattach-for-warmup' ,
							viewId ,
						} );
					} );
				}
			} catch {
				/* already attached / parent gone */
			}
		} else {
			fitContentView( view );
		}
		if( view.getVisible() ) {
			view.setVisible( false );
			if( tracing ) {
				safeSchedule( () => {
					mon.note( {
						op: 'set-visible' ,
						phase: 'action' ,
						decision: 'soft-hide→visible-false' ,
						viewId ,
						detail: { visible: false } ,
					} );
				} );
			}
		}
	}

	function isCenterViewAttached(view:WebContentsView | null | undefined) {
		if( isWebContentsViewDead( view ) || !mainWindow || mainWindow.isDestroyed() ) {
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
			&& !isWebContentsViewDead( view )
			&& isCenterViewAttached( view )
			&& view.getVisible(),
		);
	}

	function findRuntimeAIViewByWebContentsView(view:WebContentsView | null | undefined) {
		if( !view ) {
			return null;
		}
		return reaxel_AIViews.store.AIViews.find( item => item.view === view ) || null;
	}

	function markCenterAIViewPresented(view:WebContentsView | null | undefined) {
		const runtimeView = findRuntimeAIViewByWebContentsView( view );
		if( runtimeView ) {
			runtimeView.hasPresented = true;
		}
	}

	function detachOtherCenterViews(activeView:WebContentsView | null) {
		getAllCenterViews().forEach( view => {
			if( !view || view === activeView ) {
				return;
			}
			const runtimeView = findRuntimeAIViewByWebContentsView( view );
			/* Settings / 已首展 AI：硬 detach。未首展预加载页：soft-hide 暖机。 */
			if( runtimeView && !runtimeView.hasPresented ) {
				softHideInactiveCenterView( view );
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
		const mon = centerScheduleMonitor;
		const viewId = mon.enabled ? mon.getViewId( view ) : '';
		const attachedBefore = isCenterViewAttached( view );
		if( process.platform === 'darwin' && attachedBefore ) {
			try {
				mainWindow.contentView.removeChildView( view );
				safeSchedule( () => {
					mon.note( {
						op: 'mount-switch' ,
						phase: 'action' ,
						intent: 'switch' ,
						decision: 'darwin-remove-before-add' ,
						viewId ,
					} );
				} );
			} catch {
				safeSchedule( () => {
					mon.note( {
						op: 'mount-switch' ,
						phase: 'action' ,
						intent: 'switch' ,
						decision: 'darwin-remove-throw' ,
						viewId ,
					} );
				} );
			}
		}
		mainWindow.contentView.addChildView( view );
		view.setBounds( bounds );
		view.setVisible( true );
		safeSchedule( () => {
			mon.note( {
				op: 'mount-switch' ,
				phase: 'action' ,
				intent: 'switch' ,
				decision: attachedBefore ? 'addChildView-reorder-or-remount' : 'addChildView-fresh' ,
				viewId ,
				snapshot: snapshotActiveCenter( view , viewId ) ,
				detail: { platform: process.platform , bounds } ,
			} );
		} );
	}

	/**
	 * recover：hierarchy 破损时补挂。已挂载则绝不 addChildView（避免 reorder 闪白）。
	 */
	function mountCenterViewForRecover(view:WebContentsView , bounds:Rectangle) {
		const mon = centerScheduleMonitor;
		const viewId = mon.enabled ? mon.getViewId( view ) : '';
		const attachedBefore = isCenterViewAttached( view );
		if( !attachedBefore ) {
			mainWindow.contentView.addChildView( view );
			safeSchedule( () => {
				mon.note( {
					op: 'mount-recover' ,
					phase: 'action' ,
					intent: 'recover' ,
					decision: 'addChildView-missing' ,
					viewId ,
				} );
			} );
		} else {
			safeSchedule( () => {
				mon.note( {
					op: 'mount-recover' ,
					phase: 'action' ,
					intent: 'recover' ,
					decision: 'skip-addChildView-already-attached' ,
					viewId ,
				} );
			} );
		}
		setViewBoundsIfChanged( view , bounds );
		if( !view.getVisible() ) {
			view.setVisible( true );
			safeSchedule( () => {
				mon.note( {
					op: 'set-visible' ,
					phase: 'action' ,
					intent: 'recover' ,
					decision: 'recover→visible-true' ,
					viewId ,
				} );
			} );
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
	 *
	 * 预加载首切：目标尚未 hasPresented 时，用上一中心页遮盖至目标可绘再 promote，
	 * 避免「detach 旧页 → 挂上无帧缓冲的新页」白闪。
	 */
	let lastPresentedCenterView: WebContentsView | null = null;
	let preloadHandoffToken = 0;

	function presentActiveCenterView(
		intent:CenterMountIntent ,
		bounds = getCenterBounds(),
	) {
		const mon = centerScheduleMonitor;
		const activeView = getCurrentCenterView();
		const viewId = mon.enabled ? resolveCenterViewId( activeView ) : '';
		const trigger = intent === 'switch' ? 'present-switch' as const : 'present-recover' as const;
		const ownsChain = mon.enabled && foregroundScheduleDepth === 0;
		safeSchedule( () => {
			if( !mon.enabled ) {
				return;
			}
			if( ownsChain ) {
				mon.begin( {
					trigger: intent === 'switch' ? 'imperative-switch' : trigger ,
					op: 'present' ,
					viewId ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
					detail: { intent } ,
				} );
			} else {
				mon.note( {
					op: 'present' ,
					phase: 'enter' ,
					intent ,
					trigger ,
					viewId ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
			}
		} );
		if( isWebContentsViewDead( activeView ) ) {
			detachOtherCenterViews( activeView );
			safeSchedule( () => {
				mon.note( {
					op: 'present' ,
					phase: 'exit' ,
					intent ,
					decision: 'no-active-view' ,
					viewId ,
				} );
				if( ownsChain ) {
					mon.end( { decision: 'present-aborted-no-view' } );
				}
			} );
			return;
		}

		const targetRuntime = store.settingsViewOpened
			? null
			: findRuntimeAIViewByWebContentsView( activeView );
		const coverView = lastPresentedCenterView;
		const needsPreloadCoverHandoff = intent === 'switch'
			&& Boolean( targetRuntime )
			&& !targetRuntime!.hasPresented
			&& Boolean( coverView )
			&& coverView !== activeView
			&& !isWebContentsViewDead( coverView )
			&& isCenterViewHierarchyReady( coverView );

		if( needsPreloadCoverHandoff ) {
			preloadHandoffToken += 1;
			const handoffToken = preloadHandoffToken;
			mountCenterViewUnderCover( activeView , coverView! , bounds );
			safeSchedule( () => {
				mon.note( {
					op: 'mount-switch' ,
					phase: 'action' ,
					intent: 'switch' ,
					decision: 'preload-cover-handoff-armed' ,
					viewId ,
					detail: { coverViewId: resolveCenterViewId( coverView ) } ,
				} );
			} );
			schedulePreloadCoverHandoffPromote( {
				token: handoffToken ,
				activeView ,
				coverView: coverView! ,
				targetRuntime: targetRuntime! ,
				ownsChain ,
				viewId ,
			} );
			return;
		}

		preloadHandoffToken += 1;
		detachOtherCenterViews( activeView );
		if( intent === 'switch' ) {
			mountCenterViewForSwitch( activeView , bounds );
			markCenterAIViewPresented( activeView );
			lastPresentedCenterView = activeView;
		} else {
			mountCenterViewForRecover( activeView , bounds );
			if( isCenterViewHierarchyReady( activeView ) ) {
				markCenterAIViewPresented( activeView );
				lastPresentedCenterView = activeView;
			}
		}
		restoreActiveCenterViewFocus( intent );
		safeSchedule( () => {
			mon.note( {
				op: 'present' ,
				phase: 'exit' ,
				intent ,
				decision: intent === 'switch' ? 'mounted-switch' : 'mounted-recover' ,
				viewId ,
				snapshot: snapshotActiveCenter( activeView , viewId ) ,
			} );
			if( ownsChain ) {
				mon.end( {
					decision: 'present-done' ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
			}
		} );
	}

	/**
	 * 把目标插到遮盖页之下并设可见，用户仍只看到 cover，目标可在下方产帧。
	 * addChildView(view, index) 插入后原 index 及之后的 child 上移，cover 保持顶层。
	 */
	function mountCenterViewUnderCover(
		view:WebContentsView ,
		coverView:WebContentsView ,
		bounds:Rectangle,
	) {
		const mon = centerScheduleMonitor;
		const viewId = mon.enabled ? mon.getViewId( view ) : '';
		try {
			const children = mainWindow.contentView.children;
			const coverIndex = children.indexOf( coverView );
			if( coverIndex >= 0 ) {
				mainWindow.contentView.addChildView( view , coverIndex );
			} else {
				mainWindow.contentView.addChildView( view );
				mainWindow.contentView.addChildView( coverView );
			}
		} catch {
			mainWindow.contentView.addChildView( view );
			try {
				mainWindow.contentView.addChildView( coverView );
			} catch { /* cover already top */ }
		}
		view.setBounds( bounds );
		view.setVisible( true );
		coverView.setVisible( true );
		safeSchedule( () => {
			mon.note( {
				op: 'mount-switch' ,
				phase: 'action' ,
				intent: 'switch' ,
				decision: 'addChildView-under-cover' ,
				viewId ,
				detail: { platform: process.platform , bounds } ,
			} );
		} );
	}

	function waitForPreloadHandoffPaint(view:WebContentsView):Promise<void> {
		return new Promise( resolve => {
			let settled = false;
			const finish = () => {
				if( settled ) {
					return;
				}
				settled = true;
				resolve();
			};
			const webContents = getAliveWebContents( view );
			if( !webContents ) {
				finish();
				return;
			}
			/* 遮盖下双 rAF，尽量等一帧合成；失败则短超时兜底 */
			void webContents
				.executeJavaScript(
					'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))' ,
				)
				.then( finish )
				.catch( finish );
			setTimeout( finish , 160 );
		} );
	}

	function schedulePreloadCoverHandoffPromote(options:{
		token:number;
		activeView:WebContentsView;
		coverView:WebContentsView;
		targetRuntime:RuntimeAIView;
		ownsChain:boolean;
		viewId:string;
	}) {
		const {
			token ,
			activeView ,
			coverView ,
			targetRuntime ,
			ownsChain ,
			viewId ,
		} = options;
		const mon = centerScheduleMonitor;

		const promote = async() => {
			if( token !== preloadHandoffToken ) {
				return;
			}
			if( getCurrentCenterView() !== activeView || isWebContentsViewDead( activeView ) ) {
				return;
			}
			if( !targetRuntime.ready ) {
				const webContents = getAliveWebContents( activeView );
				if( webContents && webContents.isLoading() ) {
					await new Promise<void>( resolve => {
						let done = false;
						const finish = () => {
							if( done ) {
								return;
							}
							done = true;
							resolve();
						};
						webContents.once( 'did-stop-loading' , finish );
						webContents.once( 'did-fail-load' , finish );
						setTimeout( finish , 8000 );
					} );
				} else {
					targetRuntime.ready = true;
				}
			}
			if( token !== preloadHandoffToken || getCurrentCenterView() !== activeView ) {
				return;
			}
			await waitForPreloadHandoffPaint( activeView );
			if( token !== preloadHandoffToken || getCurrentCenterView() !== activeView ) {
				return;
			}
			try {
				mainWindow.contentView.addChildView( activeView );
			} catch { /* already top */ }
			activeView.setVisible( true );
			markCenterAIViewPresented( activeView );
			lastPresentedCenterView = activeView;
			detachOtherCenterViews( activeView );
			restoreActiveCenterViewFocus( 'switch' );
			safeSchedule( () => {
				mon.note( {
					op: 'present' ,
					phase: 'exit' ,
					intent: 'switch' ,
					decision: 'preload-cover-handoff-promoted' ,
					viewId ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
				if( ownsChain ) {
					mon.end( {
						decision: 'present-handoff-done' ,
						snapshot: snapshotActiveCenter( activeView , viewId ) ,
					} );
				}
			} );
		};

		void promote();
	}

	/** L0：Alt-Tab / 点击回焦 —— hierarchy 完好则只还焦点（默认节流下由 Chromium 产帧）。 */
	function recoverActiveCenterViewAfterFocus() {
		withForegroundScheduleFlag( () => {
			const mon = centerScheduleMonitor;
			const activeView = getCurrentCenterView();
			const viewId = mon.enabled ? resolveCenterViewId( activeView ) : '';
			safeSchedule( () => {
				mon.begin( {
					trigger: 'focus' ,
					op: 'recover-after-focus' ,
					viewId ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
			} );
			if( isWebContentsViewDead( activeView ) ) {
				safeSchedule( () => {
					mon.end( { decision: 'no-active-view' } );
				} );
				return;
			}
			if( !isCenterViewHierarchyReady( activeView ) ) {
				safeSchedule( () => {
					mon.note( {
						op: 'hierarchy-check' ,
						phase: 'decision' ,
						decision: 'hierarchy-broken→present-recover' ,
						trigger: 'focus' ,
						viewId ,
						snapshot: snapshotActiveCenter( activeView , viewId ) ,
					} );
				} );
				presentActiveCenterView( 'recover' );
				safeSchedule( () => {
					mon.end( {
						decision: 'delegated-present-recover' ,
						snapshot: snapshotActiveCenter( activeView , viewId ) ,
					} );
				} );
				return;
			}
			safeSchedule( () => {
				mon.note( {
					op: 'hierarchy-check' ,
					phase: 'decision' ,
					decision: 'hierarchy-ready→focus-only' ,
					trigger: 'focus' ,
					viewId ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
			} );
			restoreActiveCenterViewFocus( 'recover' );
			safeSchedule( () => {
				mon.end( {
					decision: 'focus-only-done' ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
			} );
		} );
	}

	/**
	 * L1：show / restore —— hierarchy 与 layout 拆开。
	 * layout 过期只 setBounds；hierarchy 破损才 recover mount。禁止踢绘。
	 */
	function softRecoverActiveCenterView(trigger: 'show' | 'restore' = 'show') {
		withForegroundScheduleFlag( () => {
			const mon = centerScheduleMonitor;
			const bounds = getCenterBounds();
			const activeView = getCurrentCenterView();
			const viewId = mon.enabled ? resolveCenterViewId( activeView ) : '';
			safeSchedule( () => {
				mon.begin( {
					trigger ,
					op: 'soft-recover' ,
					viewId ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
					detail: { targetBounds: bounds } ,
				} );
			} );
			if( isWebContentsViewDead( activeView ) ) {
				safeSchedule( () => {
					mon.end( { decision: 'no-active-view' } );
				} );
				return;
			}
			if( !isCenterViewHierarchyReady( activeView ) ) {
				safeSchedule( () => {
					mon.note( {
						op: 'hierarchy-check' ,
						phase: 'decision' ,
						decision: 'hierarchy-broken→present-recover' ,
						trigger ,
						viewId ,
						snapshot: snapshotActiveCenter( activeView , viewId ) ,
					} );
				} );
				presentActiveCenterView( 'recover' , bounds );
				safeSchedule( () => {
					mon.end( {
						decision: 'delegated-present-recover' ,
						snapshot: snapshotActiveCenter( activeView , viewId ) ,
					} );
				} );
				return;
			}
			safeSchedule( () => {
				mon.note( {
					op: 'hierarchy-check' ,
					phase: 'decision' ,
					decision: 'hierarchy-ready→bounds+focus' ,
					trigger ,
					viewId ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
			} );
			setViewBoundsIfChanged( activeView , bounds );
			restoreActiveCenterViewFocus( 'recover' );
			safeSchedule( () => {
				mon.end( {
					decision: 'bounds-focus-done' ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
			} );
		} );
	}

	function resolveCenterViewId(view: WebContentsView | null | undefined): string {
		if( !view ) {
			return store.settingsViewOpened ? 'settings' : ( store.currentAIViewKey || '' );
		}
		return centerScheduleMonitor.getViewId( view )
			|| ( store.settingsViewOpened ? 'settings' : ( store.currentAIViewKey || '' ) );
	}

	function snapshotActiveCenter(
		view: WebContentsView | null | undefined ,
		viewId: string ,
	) {
		try {
			return snapshotCenterViewHierarchy( {
				view ,
				viewId ,
				attached: isCenterViewAttached( view ) ,
				ready: !store.settingsViewOpened
					? Boolean( reaxel_AIViews().currentAIView?.ready )
					: true ,
				settingsOpened: store.settingsViewOpened ,
				mainFocused: !mainWindow.isDestroyed() && mainWindow.isFocused() ,
				mainVisible: !mainWindow.isDestroyed() && mainWindow.isVisible() ,
				mainMinimized: !mainWindow.isDestroyed() && mainWindow.isMinimized() ,
				childrenCount: mainWindow.isDestroyed()
					? undefined
					: mainWindow.contentView.children.length ,
			} );
		} catch {
			return null;
		}
	}

	/** >0 表示处于 L0/L1 回前台链内，present 只挂接不自封链 */
	let foregroundScheduleDepth = 0;
	function withForegroundScheduleFlag(fn: () => void): void {
		foregroundScheduleDepth += 1;
		try {
			fn();
		} finally {
			foregroundScheduleDepth -= 1;
		}
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
		if( isWebContentsViewDead( view ) ) {
			return;
		}
		const prev = view.getBounds();
		const tracing = centerScheduleMonitor.enabled && Boolean( centerScheduleMonitor.activeChainId );
		if( isSameBounds( prev , bounds ) ) {
			if( tracing && centerScheduleMonitor.shouldLogBoundsSkipped() ) {
				safeSchedule( () => {
					centerScheduleMonitor.note( {
						op: 'set-bounds' ,
						phase: 'action' ,
						decision: 'skipped-same-bounds' ,
						viewId: centerScheduleMonitor.getViewId( view ) || resolveCenterViewId( view ) ,
						detail: { bounds } ,
					} );
				} );
			}
			return;
		}
		view.setBounds( bounds );
		if( tracing ) {
			safeSchedule( () => {
				centerScheduleMonitor.note( {
					op: 'set-bounds' ,
					phase: 'action' ,
					decision: 'applied' ,
					viewId: centerScheduleMonitor.getViewId( view ) || resolveCenterViewId( view ) ,
					snapshot: {
						prevBounds: prev ,
						bounds ,
					} ,
				} );
			} );
		}
	}

	function focusCurrentContentView() {
		mainWindow.focus();
		focusCenterWebContents();
	}

	/** 仅聚焦中心内容 WebContents（不碰 BrowserWindow），供窗口 focus 恢复使用。 */
	function focusCenterWebContents() {
		const view = getCurrentCenterView();
		if( isWebContentsViewDead( view ) ) {
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
		const chainId = centerScheduleMonitor.activeChainId;
		setImmediate( () => {
			const noteFocus = (decision: string , viewId?: string , detail?: Record<string , unknown>) => {
				if( !centerScheduleMonitor.enabled ) {
					return;
				}
				centerScheduleMonitor.note( {
					op: 'restore-focus' ,
					phase: 'action' ,
					intent ,
					decision ,
					viewId ,
					detail ,
					chainId: chainId || undefined ,
				} );
			};
			if( !mainWindow || mainWindow.isDestroyed() || !mainWindow.isFocused() ) {
				noteFocus( 'skip-main-not-focused' );
				return;
			}
			const focusedWindow = BrowserWindow.getFocusedWindow();
			if( focusedWindow && focusedWindow !== mainWindow ) {
				noteFocus( 'skip-other-window-focused' );
				return;
			}
			const promptStore = reaxel_PromptViews.store;
			for( const side of [ 'left' , 'right' ] as const ) {
				const promptView = promptStore[side]?.view;
				if(
					!isWebContentsViewDead( promptView )
					&& promptView.webContents.isFocused()
				) {
					noteFocus( `skip-prompt-${ side }-focused` );
					return;
				}
			}
			const view = getCurrentCenterView();
			if( isWebContentsViewDead( view ) ) {
				noteFocus( 'skip-no-view' );
				return;
			}
			if( view.webContents.isFocused() ) {
				noteFocus( 'already-focused' , resolveCenterViewId( view ) );
				return;
			}
			const focusSource:FocusMonitorFocusSource = intent === 'recover'
				? 'window-restore-paint'
				: 'apply-visibility';
			noteFocus( 'focus-webContents' , resolveCenterViewId( view ) , { focusSource } );
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
			try {
				registerAISwitchGlobalShortcuts();
				recoverActiveCenterViewAfterFocus();
			} catch ( error ) {
				console.error( '[Views] focus recover failed:' , error );
			}
		} );
		mainWindow.on( 'show' , () => {
			try {
				registerAISwitchGlobalShortcuts();
				softRecoverActiveCenterView( 'show' );
			} catch ( error ) {
				console.error( '[Views] show recover failed:' , error );
			}
		} );
		mainWindow.on( 'restore' , () => {
			try {
				registerAISwitchGlobalShortcuts();
				softRecoverActiveCenterView( 'restore' );
			} catch ( error ) {
				console.error( '[Views] restore recover failed:' , error );
			}
		} );
		mainWindow.on( 'blur' , () => {
			centerScheduleMonitor.markBackground( 'blur' );
			unregisterAISwitchGlobalShortcuts();
		} );
		mainWindow.on( 'hide' , () => {
			centerScheduleMonitor.markBackground( 'hide' );
			unregisterAISwitchGlobalShortcuts();
		} );
		mainWindow.on( 'minimize' , () => {
			centerScheduleMonitor.markBackground( 'minimize' );
			unregisterAISwitchGlobalShortcuts();
		} );
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
		softHideInactiveCenterView ,
		getLastPresentedCenterView : () => lastPresentedCenterView ,
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
import { getAliveWebContents , isWebContentsViewDead } from '#main/services/web-contents-view-alive.utility';
import ElectronStore from "electron-store";
import { mainWindow } from "#main/mainWindow";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
import {
	type FocusMonitorFocusSource ,
	safeFocusViewWithMonitor ,
} from "#main/reaxels/Views/AI-Views";
import {
	getWhiteScreenMonitor ,
	snapshotCenterViewHierarchy ,
} from "#main/reaxels/Views/AI-Views/white-screen-monitor.retexel";
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

/** 中心 view 调度链追踪（无 capturePage 副作用） */
const centerScheduleMonitor = getWhiteScreenMonitor();