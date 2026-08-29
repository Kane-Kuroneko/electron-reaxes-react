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
		if( !hasUsableBrowserWindowContent( mainWindow ) ) {
			return;
		}
		clipMainShellToMenuBar( mainWindow );
		const { width , height } = mainWindow.getContentBounds();
		const centerBounds = getCenterBounds( { x : 0 , y : 0 , width , height } );
		/* 当前中心页 + 未首展预加载（盖下全尺寸）。已首展闲置仍 detach，不要拉回中心区。 */
		if( target ) {
			if( !store.settingsViewOpened && target === store.currentAIViewKey ) {
				fitCurrentCenterView( centerBounds );
			}
			layoutUnpresentedPreloadViews( centerBounds );
			reaxel_PromptViews().syncBounds( { x : 0 , y : 0 , width , height } );
			return;
		}
		fitCurrentCenterView( centerBounds );
		layoutUnpresentedPreloadViews( centerBounds );
		const settingsView = reaxel_SettingsView.store.settingsView.view;
		if( store.settingsViewOpened && settingsView && !isWebContentsViewDead( settingsView ) ) {
			setViewBoundsIfChanged( settingsView , centerBounds );
		}
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
	 * - reaxel_AIViews.applyVisibility：只 park 未首展预加载（不 detach、不 addChildView）
	 * - Reaxel_View.presentActiveCenterView：唯一 mount/promote 入口；先置顶，拆页放到下一拍
	 *   未首展 load 中：attach + visible + 全尺寸盖下，让 SPA hydrate
	 *   未首展 load 完：仍 attach+全尺寸，但 visible=false，避免 7 层同时合成卡住切换
	 *   已首展闲置：硬 detach（二次切换已验证丝滑）
	 *
	 * 两种意图（禁止 reason 字符串矩阵）：
	 * - switch：AI / Settings / 冷启动 —— 允许平台级 remount/reorder
	 * - recover：仅 hierarchy 破损时补挂；禁止 remount/reorder/nudge
	 *
	 * 窗口生命周期 ≠ 产帧所有者（2026-08-22）：
	 * - 遮挡还原（minimize/hide → restore/show）：只修破损 hierarchy / 过期 layout，
	 *   产帧交给 Chromium WasShown。禁止 webContents.focus()（electron#28255）。
	 * - Alt-Tab（blur 时窗口仍可见）：hierarchy 完好则只还输入焦点（electron#28163）。
	 * - 坍缩客户区（最大化后最小化的 0×0 / 1×1）不是 layout 源，禁止写进 WCV。
	 * 禁止 ±1 / invalidate 踢绘、禁止 backgroundThrottling:false。
	 */

	/** 监控不得抛穿业务调度。 */
	function safeSchedule(fn: () => void) {
		try {
			fn();
		} catch { /* 监控不得中断调度 */ }
	}

	/**
	 * 窗口回前台策略。遮挡还原（任务栏/托盘）不是 paint 入口；
	 * 只有「窗口一直可见的失焦」（Alt-Tab）才还 WCV 输入焦点。
	 */
	let occludedResumePending = false;

	function markOccludedResume(): void {
		occludedResumePending = true;
	}

	function consumeOccludedResume(): boolean {
		if( !occludedResumePending ) {
			return false;
		}
		occludedResumePending = false;
		return true;
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

	/**
	 * 预加载 v8：未首展页保持 attach + 全尺寸。
	 * load 中且有可见顶页盖住 → visible=true（盖下 hydrate）。
	 * load 完 → visible=false，只留 1 层在合成，避免 Win 上多层 WebContentsView 切换卡顿。
	 * 已首展闲置页仍硬 detach。拆页放到 setImmediate，不跟 promote 抢同一帧 GPU。
	 * 禁止 cover-handoff / 热路径 capturePage / backgroundThrottling:false。
	 * applyVisibility / park 不得 addChildView。
	 */
	function isUnpresentedPreloadView(view:WebContentsView | null | undefined) {
		const runtimeView = findRuntimeAIViewByWebContentsView( view );
		return Boolean( runtimeView && !runtimeView.hasPresented );
	}

	function isVisibleCoverReady(cover:WebContentsView | null | undefined , parked:WebContentsView) {
		return Boolean(
			cover
			&& cover !== parked
			&& !isWebContentsViewDead( cover )
			&& isCenterViewAttached( cover )
			&& cover.getVisible(),
		);
	}

	function isCenterWebContentsLoading(view:WebContentsView) {
		return Boolean( getAliveWebContents( view )?.isLoading() );
	}

	/** 未首展：不 detach、不 addChildView。仍在 load 才盖下露出，load 完藏起来减合成层。 */
	function parkUnpresentedPreloadView(view:WebContentsView | null | undefined) {
		if( isWebContentsViewDead( view ) ) {
			return;
		}
		const runtimeView = findRuntimeAIViewByWebContentsView( view );
		if( runtimeView?.hasPresented ) {
			return;
		}
		if( !isCenterViewAttached( view ) ) {
			return;
		}
		const mon = centerScheduleMonitor;
		const tracing = mon.enabled && Boolean( mon.activeChainId );
		const viewId = tracing ? mon.getViewId( view ) : '';
		setViewBoundsIfChanged( view , getCenterBounds() );
		const coverReady = isVisibleCoverReady( getCurrentCenterView() , view );
		const loading = isCenterWebContentsLoading( view );
		const shouldShow = coverReady && loading;
		if( view.getVisible() !== shouldShow ) {
			view.setVisible( shouldShow );
			if( tracing ) {
				safeSchedule( () => {
					mon.note( {
						op: 'set-visible' ,
						phase: 'action' ,
						decision: shouldShow
							? 'preload-park→visible-under-cover'
							: 'preload-park→hidden-after-load' ,
						viewId ,
						detail: { visible: shouldShow , loading } ,
					} );
				} );
			}
		}
	}

	function layoutUnpresentedPreloadViews(bounds:Rectangle) {
		reaxel_AIViews.store.AIViews.forEach( runtimeView => {
			if( runtimeView.hasPresented || isWebContentsViewDead( runtimeView.view ) ) {
				return;
			}
			if( !isCenterViewAttached( runtimeView.view ) ) {
				return;
			}
			setViewBoundsIfChanged( runtimeView.view , bounds );
		} );
	}

	function detachInactiveCenterView(view:WebContentsView | null | undefined) {
		if( isUnpresentedPreloadView( view ) ) {
			parkUnpresentedPreloadView( view );
			return;
		}
		safeDetachWebContentsView( view );
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

	/** 中心区（AI/Settings）里最上层的那一个。Prompt 等非中心子 view 不算。 */
	function isTopMostCenterView(view:WebContentsView | null | undefined) {
		if( isWebContentsViewDead( view ) || !mainWindow || mainWindow.isDestroyed() ) {
			return false;
		}
		try {
			const centerSet = new Set( getAllCenterViews() );
			let top: WebContentsView | null = null;
			mainWindow.contentView.children.forEach( child => {
				if( centerSet.has( child as WebContentsView ) ) {
					top = child as WebContentsView;
				}
			} );
			return top === view;
		} catch {
			return false;
		}
	}

	/** 层级健康：已在 contentView、可见、且是中心区顶层。不含 bounds。 */
	function isCenterViewHierarchyReady(view:WebContentsView | null | undefined) {
		return Boolean(
			view
			&& !isWebContentsViewDead( view )
			&& isCenterViewAttached( view )
			&& view.getVisible()
			&& isTopMostCenterView( view ),
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

	/**
	 * 非 active：已首展硬 detach；未首展已经 park 过的不要再碰（再 park 会在切换热路径
	 * 里扫一遍 bounds，而且曾把 load 完的页重新 setVisible(true) 叠成 7 层）。
	 * 拆页必须在 active 已经置顶之后；调用方用 setImmediate 错开 promote 同一帧。
	 */
	function detachOtherCenterViews(activeView:WebContentsView | null) {
		getAllCenterViews().forEach( view => {
			if( !view || view === activeView ) {
				return;
			}
			if( isUnpresentedPreloadView( view ) ) {
				return;
			}
			safeDetachWebContentsView( view );
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
		const alreadyTop = attachedBefore && isTopMostCenterView( view );
		/* 盖下暖机的未首展页已在树里，darwin remove+add 会 WasHidden 再闪。 */
		const warmingInPlace = attachedBefore && isUnpresentedPreloadView( view );
		if( process.platform === 'darwin' && attachedBefore && !warmingInPlace && !alreadyTop ) {
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
		if( !alreadyTop ) {
			mainWindow.contentView.addChildView( view );
		}
		setViewBoundsIfChanged( view , bounds );
		if( !view.getVisible() ) {
			view.setVisible( true );
		}
		safeSchedule( () => {
			mon.note( {
				op: 'mount-switch' ,
				phase: 'action' ,
				intent: 'switch' ,
				decision: alreadyTop
					? 'already-top-skip-addChildView'
					: attachedBefore ? 'addChildView-reorder-or-remount' : 'addChildView-fresh' ,
				viewId ,
				snapshot: snapshotActiveCenter( view , viewId ) ,
				detail: { platform: process.platform , bounds } ,
			} );
		} );
	}

	/**
	 * recover：hierarchy 破损时补挂。已在顶层则绝不 addChildView（避免 reorder 闪白）。
	 * 未首展预加载会占着更高 z-order，启动 recover 必须把当前页抬上来。
	 */
	function mountCenterViewForRecover(view:WebContentsView , bounds:Rectangle) {
		const mon = centerScheduleMonitor;
		const viewId = mon.enabled ? mon.getViewId( view ) : '';
		const attachedBefore = isCenterViewAttached( view );
		const needsPromote = !attachedBefore || !isTopMostCenterView( view );
		if( needsPromote ) {
			mainWindow.contentView.addChildView( view );
			safeSchedule( () => {
				mon.note( {
					op: 'mount-recover' ,
					phase: 'action' ,
					intent: 'recover' ,
					decision: attachedBefore
						? 'addChildView-promote-under-preload'
						: 'addChildView-missing' ,
					viewId ,
				} );
			} );
		} else {
			safeSchedule( () => {
				mon.note( {
					op: 'mount-recover' ,
					phase: 'action' ,
					intent: 'recover' ,
					decision: 'skip-addChildView-already-top' ,
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

	let centerDetachGeneration = 0;
	function scheduleDetachOtherCenterViews(activeView:WebContentsView | null) {
		const token = ++centerDetachGeneration;
		const held = activeView;
		const mon = centerScheduleMonitor;
		safeSchedule( () => {
			mon.note( {
				op: 'detach' ,
				phase: 'action' ,
				decision: 'detach-others-deferred' ,
				viewId: mon.enabled ? resolveCenterViewId( held ) : '' ,
			} );
		} );
		setImmediate( () => {
			if( token !== centerDetachGeneration ) {
				return;
			}
			const current = getCurrentCenterView();
			if( held && current !== held ) {
				return;
			}
			detachOtherCenterViews( current );
		} );
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
	 * 预加载 v8：先把目标置顶；已首展闲置页的 detach 放到下一拍，避免与 promote 抢同一帧 GPU。
	 * 未首展 load 中盖下可见；load 完 hidden 减合成层。
	 */
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
			centerDetachGeneration += 1;
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

		if( intent === 'switch' ) {
			mountCenterViewForSwitch( activeView , bounds );
			markCenterAIViewPresented( activeView );
		} else {
			mountCenterViewForRecover( activeView , bounds );
			if( isCenterViewHierarchyReady( activeView ) ) {
				markCenterAIViewPresented( activeView );
			}
		}
		/* 先置顶；拆页下一拍，避免 removeChildView 跟 promote 抢同一帧。 */
		scheduleDetachOtherCenterViews( activeView );
		if( intent === 'switch' || !occludedResumePending ) {
			restoreActiveCenterViewFocus( intent );
		}
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

	function noteHierarchyDecision(
		trigger: 'focus' | 'show' | 'restore' ,
		viewId: string ,
		activeView: WebContentsView | null | undefined ,
		decision: string ,
	) {
		safeSchedule( () => {
			centerScheduleMonitor.note( {
				op: 'hierarchy-check' ,
				phase: 'decision' ,
				decision ,
				trigger ,
				viewId ,
				snapshot: snapshotActiveCenter( activeView , viewId ) ,
			} );
		} );
	}

	/**
	 * 层级破了才 present('recover')。健康树不在窗口事件上 mount / focus / 踢绘。
	 * 返回是否已委托 present。
	 */
	function repairCenterHierarchyIfBroken(
		trigger: 'focus' | 'show' | 'restore' ,
		viewId: string ,
		activeView: WebContentsView | null | undefined ,
		bounds?: Rectangle ,
	): boolean {
		if( isWebContentsViewDead( activeView ) ) {
			safeSchedule( () => {
				centerScheduleMonitor.end( { decision: 'no-active-view' } );
			} );
			return true;
		}
		if( isCenterViewHierarchyReady( activeView ) ) {
			return false;
		}
		noteHierarchyDecision( trigger , viewId , activeView , 'hierarchy-broken→present-recover' );
		if( bounds ) {
			presentActiveCenterView( 'recover' , bounds );
		} else {
			presentActiveCenterView( 'recover' );
		}
		safeSchedule( () => {
			centerScheduleMonitor.end( {
				decision: 'delegated-present-recover' ,
				snapshot: snapshotActiveCenter( activeView , viewId ) ,
			} );
		} );
		return true;
	}

	/** 窗口 `focus`：破了才补挂；遮挡还原空操作；仅 Alt-Tab 还输入焦点。 */
	function recoverActiveCenterViewAfterFocus() {
		withForegroundScheduleFlag( () => {
			const mon = centerScheduleMonitor;
			const activeView = getCurrentCenterView();
			const viewId = mon.enabled ? resolveCenterViewId( activeView ) : '';
			const compositorOwned = occludedResumePending;
			safeSchedule( () => {
				mon.begin( {
					trigger: 'focus' ,
					op: 'recover-after-focus' ,
					viewId ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
					detail: {
						resumePolicy: compositorOwned ? 'compositor-owned' : 'alt-tab-input' ,
					} ,
				} );
			} );
			if( repairCenterHierarchyIfBroken( 'focus' , viewId , activeView ) ) {
				consumeOccludedResume();
				return;
			}
			if( consumeOccludedResume() ) {
				noteHierarchyDecision( 'focus' , viewId , activeView , 'hierarchy-ready→compositor-owned-noop' );
				safeSchedule( () => {
					mon.end( {
						decision: 'compositor-owned-noop' ,
						snapshot: snapshotActiveCenter( activeView , viewId ) ,
					} );
				} );
				return;
			}
			if( !isWebContentsViewDead( activeView ) && activeView.webContents.isFocused() ) {
				noteHierarchyDecision( 'focus' , viewId , activeView , 'hierarchy-ready→noop' );
				safeSchedule( () => {
					mon.end( {
						decision: 'noop-already-focused' ,
						snapshot: snapshotActiveCenter( activeView , viewId ) ,
					} );
				} );
				return;
			}
			noteHierarchyDecision( 'focus' , viewId , activeView , 'hierarchy-ready→input-focus' );
			restoreActiveCenterViewFocus( 'recover' );
			safeSchedule( () => {
				mon.end( {
					decision: 'input-focus-scheduled' ,
					snapshot: snapshotActiveCenter( activeView , viewId ) ,
				} );
			} );
		} );
	}

	/**
	 * show / restore：只修层级与（可用客户区上的）layout。
	 * 产帧与输入焦点都不在这条路上。
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
					detail: {
						targetBounds: bounds ,
						resumePolicy: occludedResumePending ? 'compositor-owned' : 'layout-only' ,
					} ,
				} );
			} );
			if( repairCenterHierarchyIfBroken( trigger , viewId , activeView , bounds ) ) {
				return;
			}
			let boundsChanged = false;
			if( hasUsableBrowserWindowContent( mainWindow ) ) {
				boundsChanged = setViewBoundsIfChanged( activeView , bounds );
			}
			noteHierarchyDecision(
				trigger ,
				viewId ,
				activeView ,
				boundsChanged
					? 'hierarchy-ready→bounds-applied'
					: 'hierarchy-ready→layout-noop' ,
			);
			safeSchedule( () => {
				mon.end( {
					decision: boundsChanged ? 'bounds-applied-done' : 'layout-noop-done' ,
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
			let windowBackgroundColor: string | undefined;
			try {
				if( !mainWindow.isDestroyed() ) {
					windowBackgroundColor = mainWindow.getBackgroundColor();
				}
			} catch {
				windowBackgroundColor = undefined;
			}
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
				windowBackgroundColor ,
			} );
		} catch {
			return null;
		}
	}

	/** 窗口事件同步探针：先于 recover，保留事件瞬间的 window / view bounds */
	function probeWindowLifecycle(
		trigger: 'focus' | 'show' | 'restore' | 'blur' | 'hide' | 'minimize' ,
	) {
		if( !centerScheduleMonitor.enabled ) {
			return;
		}
		try {
			const activeView = getCurrentCenterView();
			const viewId = resolveCenterViewId( activeView );
			centerScheduleMonitor.noteWindowLifecycle( {
				trigger ,
				win: mainWindow ,
				viewId ,
				activeView ,
				snapshot: snapshotActiveCenter( activeView , viewId ) ,
				detail: {
					resumePolicy: occludedResumePending ? 'compositor-owned' : 'alt-tab-input' ,
				} ,
			} );
		} catch { /* 监控不得中断调度 */ }
	}

	/** >0 表示处于窗口回前台链内，present 只挂接不自封链 */
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

	function setViewBoundsIfChanged(view:WebContentsView | null | undefined , bounds:Rectangle): boolean {
		if( isWebContentsViewDead( view ) ) {
			return false;
		}
		const tracing = centerScheduleMonitor.enabled && Boolean( centerScheduleMonitor.activeChainId );
		if( isCollapsedWindowContentRect( bounds ) ) {
			if( tracing ) {
				safeSchedule( () => {
					centerScheduleMonitor.note( {
						op: 'set-bounds' ,
						phase: 'action' ,
						decision: 'skipped-collapsed-bounds' ,
						viewId: centerScheduleMonitor.getViewId( view ) || resolveCenterViewId( view ) ,
						detail: { bounds } ,
					} );
				} );
			}
			return false;
		}
		const prev = view.getBounds();
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
			return false;
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
		return true;
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
	 * 只在 Alt-Tab（窗口一直可见）和用户换页 present('switch') 上还焦点；
	 * 禁止叠在 minimize/restore 还原动画上（electron#28255）。
	 */
	function restoreActiveCenterViewFocus(intent:CenterMountIntent = 'recover') {
		const chainId = centerScheduleMonitor.activeChainId;
		setImmediate( () => {
			const noteFocus = (
				decision: string ,
				viewId?: string ,
				detail?: Record<string , unknown> ,
				snapshotView?: WebContentsView | null ,
			) => {
				if( !centerScheduleMonitor.enabled ) {
					return;
				}
				const resolvedId = viewId || resolveCenterViewId( snapshotView );
				centerScheduleMonitor.note( {
					op: 'restore-focus' ,
					phase: 'action' ,
					intent ,
					decision ,
					viewId: resolvedId ,
					snapshot: snapshotActiveCenter( snapshotView ?? getCurrentCenterView() , resolvedId ) ,
					detail ,
					chainId: chainId || undefined ,
				} );
			};
			if( !mainWindow || mainWindow.isDestroyed() ) {
				noteFocus( 'skip-main-not-focused' );
				return;
			}
			if( !mainWindow.isVisible() || mainWindow.isMinimized() ) {
				noteFocus( 'skip-window-not-presented' , undefined , {
					window: {
						focused: mainWindow.isFocused() ,
						minimized: mainWindow.isMinimized() ,
						visible: mainWindow.isVisible() ,
					} ,
				} );
				return;
			}
			if( !mainWindow.isFocused() ) {
				noteFocus( 'skip-main-not-focused' , undefined , {
					window: {
						focused: false ,
						minimized: mainWindow.isMinimized() ,
						visible: mainWindow.isVisible() ,
					} ,
				} );
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
				noteFocus( 'already-focused' , resolveCenterViewId( view ) , undefined , view );
				return;
			}
			const focusSource:FocusMonitorFocusSource = intent === 'recover'
				? 'window-focus-input'
				: 'apply-visibility';
			noteFocus( 'focus-webContents' , resolveCenterViewId( view ) , { focusSource } , view );
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
		try {
			const settings = getRuntimeSettings();
			centerScheduleMonitor.noteSessionEnv( {
				gpu_acceleration: settings.system?.gpu_acceleration !== false ,
				appearanceTheme: settings.appearance?.theme ,
				windowBackgroundColor: !mainWindow.isDestroyed()
					? mainWindow.getBackgroundColor()
					: null ,
				contentChildren: mainWindow.isDestroyed()
					? 0
					: mainWindow.contentView.children.length ,
				isPackaged: app.isPackaged ,
			} );
		} catch ( error ) {
			console.warn( '[Views] WhiteScreenMonitor session-env failed:' , error );
		}
		mainWindow.on( 'resize' , () => {
			fitWindow();
		} );
		mainWindow.on( 'focus' , () => {
			try {
				probeWindowLifecycle( 'focus' );
				registerAISwitchGlobalShortcuts();
				recoverActiveCenterViewAfterFocus();
			} catch ( error ) {
				console.error( '[Views] focus recover failed:' , error );
			}
		} );
		mainWindow.on( 'show' , () => {
			try {
				probeWindowLifecycle( 'show' );
				registerAISwitchGlobalShortcuts();
				softRecoverActiveCenterView( 'show' );
			} catch ( error ) {
				console.error( '[Views] show recover failed:' , error );
			}
		} );
		mainWindow.on( 'restore' , () => {
			try {
				markOccludedResume();
				probeWindowLifecycle( 'restore' );
				registerAISwitchGlobalShortcuts();
				softRecoverActiveCenterView( 'restore' );
			} catch ( error ) {
				console.error( '[Views] restore recover failed:' , error );
			}
		} );
		mainWindow.on( 'blur' , () => {
			try {
				if( !mainWindow.isDestroyed() && ( mainWindow.isMinimized() || !mainWindow.isVisible() ) ) {
					markOccludedResume();
				}
			} catch { /* 只更新回前台策略 */ }
			probeWindowLifecycle( 'blur' );
			centerScheduleMonitor.markBackground( 'blur' );
			unregisterAISwitchGlobalShortcuts();
		} );
		mainWindow.on( 'hide' , () => {
			markOccludedResume();
			probeWindowLifecycle( 'hide' );
			centerScheduleMonitor.markBackground( 'hide' );
			unregisterAISwitchGlobalShortcuts();
		} );
		mainWindow.on( 'minimize' , () => {
			markOccludedResume();
			probeWindowLifecycle( 'minimize' );
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
	 * applyVisibility：未首展 park；已首展闲置页的 detach 归 present。
	 * present 由本处或同步切换路径负责。
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
		parkUnpresentedPreloadView ,
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
	app ,
	BrowserWindow ,
	type Rectangle ,
	WebContentsView,
} from "electron";
import { getMenuBarHeight as resolveMenuBarHeight } from '#shared/menubar-geometry';
import { clipMainShellToMenuBar } from '#main/services/clip-main-shell-to-menubar.utility';
import {
	hasUsableBrowserWindowContent ,
	isCollapsedWindowContentRect,
} from '#main/services/usable-window-content.utility';
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
import { perf , PerfPhase } from '#shared/utils/switch-perf-recorder.utility';
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from "reaxes";

/** 中心 view 调度链追踪（无 capturePage 副作用） */
const centerScheduleMonitor = getWhiteScreenMonitor();
