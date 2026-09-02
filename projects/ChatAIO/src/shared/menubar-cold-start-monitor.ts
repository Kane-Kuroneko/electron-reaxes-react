/**
 * 冷启动 menubar 白屏检测器 — 跨进程协议与裁决。
 *
 * 只观察，不 capturePage / 不踢绘 / 不改生命周期。
 * 设计：docs/features/menubar-cold-start-monitor.md
 */

/** renderer → main：菜单项已 layout。这是 Phase 5 产品门闩，不是观测通道。 */
export type MenubarVisualReadyPayload = {
	ts : number;
	hrt : number;
	detail? : Record<string , unknown>;
};

/** renderer → main：观测用里程碑。不得当作 Phase 5 门闩。 */
export type MenubarBootProbePayload = {
	milestone : MenubarBootMilestone;
	ts : number;
	hrt : number;
	detail? : Record<string , unknown>;
};

export type MenubarBootProc = 'main' | 'renderer';

/**
 * 稳定里程碑名。分析器按 name 取 first-ts，不要临时改字符串。
 * `renderer-*` 由 MainView 发；其余由主进程发。
 */
export type MenubarBootMilestone =
	| 'boot-start'
	| 'phase-0-menubar-host'
	| 'phase-1-app-config'
	| 'phase-2-window-created'
	| 'phase-2-load-start'
	| 'phase-2-dev-retry'
	| 'phase-3-overlay-warm'
	| 'phase-4-shell-chrome'
	| 'phase-5-wait-renderer'
	| 'phase-5-wait-resolved'
	| 'phase-5-content-views-start'
	| 'window-show'
	| 'window-ready-to-show'
	| 'clip-applied'
	| 'menu-view-ready'
	| 'structure-sent'
	| 'dropdown-preload'
	| 'wcv-created'
	| 'wcv-load-attempt'
	| 'wcv-present'
	| 'renderer-bundle-eval'
	| 'renderer-ready-sent'
	| 'renderer-create-root'
	| 'renderer-app-layout'
	| 'renderer-first-paint'
	| 'renderer-fcp'
	| 'renderer-structure-applied'
	| 'renderer-chrome-commit'
	| 'renderer-visual-ready'
	| 'renderer-longtask';

export type MenubarBootWcTarget = 'menubar' | 'wcv';

export type MenubarBootLogType = 'boot-meta' | 'milestone' | 'wc-event' | 'snapshot' | 'verdict';

export type MenubarBootLayerProbe = {
	index : number;
	kind : 'web-contents-view' | 'view' | 'unknown';
	role : 'menubar-shell' | 'content' | 'unknown';
	viewId : string;
	visible : boolean | null;
	bounds : { x : number; y : number; width : number; height : number } | null;
	isLoading : boolean | null;
	url : string | null;
	osPid : number | null;
	coversMenubar : boolean;
};

export type MenubarBootSnapshot = {
	windowVisible : boolean | null;
	windowBg : string | null;
	menubarLoading : boolean | null;
	menubarUrl : string | null;
	menubarOsPid : number | null;
	shellBounds : { x : number; y : number; width : number; height : number } | null;
	shellHeightIsMenuBar : boolean | null;
	visibleWcvId : string;
	visibleWcvLoading : boolean | null;
	visibleWcvUrl : string | null;
	visibleWcvBounds : { x : number; y : number; width : number; height : number } | null;
	visibleWcvCoversMenubar : boolean;
	loadingWcvCount : number;
	contentChildCount : number;
	overlapLoading : boolean;
	layers : MenubarBootLayerProbe[];
};

export type MenubarBootLogEvent = {
	ts : number;
	hrt? : number;
	type : MenubarBootLogType;
	proc? : MenubarBootProc;
	name? : MenubarBootMilestone | string;
	target? : MenubarBootWcTarget;
	viewId? : string;
	seq? : number;
	sessionId? : string;
	detail? : Record<string , unknown>;
	snapshot? : MenubarBootSnapshot;
};

export type MenubarBootSuspect =
	| 'ready-before-visual'
	| 'phase5-before-visual'
	| 'wcv-load-before-visual'
	| 'wcv-loading-overlaps-menubar-paint'
	| 'overlay-before-visual'
	| 'window-shown-before-menubar-dom'
	| 'wcv-covers-menubar'
	| 'shell-not-clipped'
	| 'wait-timeout'
	| 'webpack-retry'
	| 'structure-late'
	| 'renderer-longtask-before-visual'
	| 'slow-menubar-visual';

export type MenubarBootVerdictSeverity = 'ok' | 'warn' | 'conflict';

export type MenubarBootVerdict = {
	severity : MenubarBootVerdictSeverity;
	suspects : MenubarBootSuspect[];
	deltas : {
		showToVisualMs : number | null;
		showToChromeMs : number | null;
		readyToVisualMs : number | null;
		readyToPhase5Ms : number | null;
		phase5ToVisualMs : number | null;
		wcvLoadToVisualMs : number | null;
		structureToVisualMs : number | null;
		overlapLoadingMs : number;
		longtaskMsBeforeVisual : number;
	};
	marks : {
		t0 : number | null;
		tShow : number | null;
		tDomReady : number | null;
		tDidFinishLoad : number | null;
		tReady : number | null;
		tChrome : number | null;
		tVisual : number | null;
		tFcp : number | null;
		tStructure : number | null;
		tWaitResolved : number | null;
		tPhase5 : number | null;
		tWcvLoad : number | null;
		tWcvPresent : number | null;
		waitReady : boolean | null;
		waitTimedOut : boolean | null;
		webpackAttempts : number | null;
	};
	hint : string;
};

/** 用户体感「好几秒白条」的门槛 */
export const MENUBAR_BOOT_SLOW_VISUAL_MS = 1500;
/** 与当前 WCV 同时 isLoading 超过该毫秒则记 overlap */
export const MENUBAR_BOOT_OVERLAP_SIGNIFICANT_MS = 200;
export const MENUBAR_BOOT_SNAPSHOT_INTERVAL_MS = 100;
export const MENUBAR_BOOT_WATCH_MS = 12000;
export const MENUBAR_BOOT_WATCH_CAP_MS = 15000;
export const MENUBAR_BOOT_LONGTASK_MS = 50;

const firstTs = (
	events : MenubarBootLogEvent[] ,
	match : ( event : MenubarBootLogEvent ) => boolean,
) : number | null => {
	for( const event of events ) {
		if( match( event ) ) {
			return event.ts;
		}
	}
	return null;
};

const firstMilestoneTs = (
	events : MenubarBootLogEvent[] ,
	name : MenubarBootMilestone | string,
) : number | null => {
	return firstTs( events , event => {
		return event.type === 'milestone' && event.name === name;
	} );
};

const firstWcEventTs = (
	events : MenubarBootLogEvent[] ,
	target : MenubarBootWcTarget ,
	eventName : string,
) : number | null => {
	return firstTs( events , event => {
		return event.type === 'wc-event'
			&& event.target === target
			&& event.name === eventName;
	} );
};

const delta = ( later : number | null , earlier : number | null ) : number | null => {
	if( later == null || earlier == null ) {
		return null;
	}
	return later - earlier;
};

/**
 * 根据 JSONL 事件裁决冷启动 menubar 是否被当前 WCV 拖慢。
 * 纯函数，主进程封链与离线分析脚本共用。
 */
export const computeMenubarColdStartVerdict = (
	events : MenubarBootLogEvent[],
) : MenubarBootVerdict => {
	const t0 = firstMilestoneTs( events , 'boot-start' ) ?? events[0]?.ts ?? null;
	const tShow = firstMilestoneTs( events , 'window-show' )
		?? firstMilestoneTs( events , 'window-ready-to-show' )
		?? firstMilestoneTs( events , 'phase-2-window-created' );
	const tDomReady = firstWcEventTs( events , 'menubar' , 'dom-ready' );
	const tDidFinishLoad = firstWcEventTs( events , 'menubar' , 'did-finish-load' );
	const tReady = firstMilestoneTs( events , 'menu-view-ready' )
		?? firstMilestoneTs( events , 'renderer-ready-sent' );
	const tChrome = firstMilestoneTs( events , 'renderer-chrome-commit' )
		?? firstMilestoneTs( events , 'renderer-app-layout' );
	const tFcp = firstMilestoneTs( events , 'renderer-fcp' )
		?? firstMilestoneTs( events , 'renderer-first-paint' );
	const tVisual = firstMilestoneTs( events , 'renderer-visual-ready' ) ?? tFcp ?? tChrome;
	const tStructure = firstMilestoneTs( events , 'renderer-structure-applied' )
		?? firstMilestoneTs( events , 'structure-sent' );
	const tPhase5 = firstMilestoneTs( events , 'phase-5-content-views-start' );
	const tWaitResolved = firstMilestoneTs( events , 'phase-5-wait-resolved' );
	const tWcvLoad = firstMilestoneTs( events , 'wcv-load-attempt' )
		?? firstWcEventTs( events , 'wcv' , 'did-start-loading' );
	const tWcvPresent = firstMilestoneTs( events , 'wcv-present' );
	const tOverlay = firstMilestoneTs( events , 'phase-3-overlay-warm' );

	const waitEvent = events.find( event => event.name === 'phase-5-wait-resolved' );
	const waitReady = typeof waitEvent?.detail?.ready === 'boolean'
		? waitEvent.detail.ready as boolean
		: null;
	const waitTimedOut = waitEvent?.detail?.timedOut === true
		? true
		: waitReady === false;
	const retryEvents = events.filter( event => event.name === 'phase-2-dev-retry' );
	const webpackAttempts = retryEvents.reduce( ( max , event ) => {
		const attempt = typeof event.detail?.attempt === 'number'
			? event.detail.attempt
			: 0;
		return Math.max( max , attempt );
	} , 0 ) || null;

	const snapshots = events.filter( event => event.type === 'snapshot' && event.snapshot );
	const snapshotInterval = MENUBAR_BOOT_SNAPSHOT_INTERVAL_MS;
	let overlapTicks = 0;
	let coversMenubar = false;
	let shellNotClipped = false;
	for( const event of snapshots ) {
		const snap = event.snapshot;
		if( !snap ) continue;
		if( snap.overlapLoading ) {
			overlapTicks += 1;
		}
		if( snap.visibleWcvCoversMenubar ) {
			coversMenubar = true;
		}
		if( snap.shellHeightIsMenuBar === false ) {
			shellNotClipped = true;
		}
	}
	const overlapLoadingMs = overlapTicks * snapshotInterval;

	const visualCutoff = tVisual ?? Number.POSITIVE_INFINITY;
	let longtaskMsBeforeVisual = 0;
	for( const event of events ) {
		if( event.name !== 'renderer-longtask' ) continue;
		if( event.ts >= visualCutoff ) continue;
		const duration = typeof event.detail?.duration === 'number'
			? event.detail.duration
			: 0;
		longtaskMsBeforeVisual += duration;
	}

	const suspects : MenubarBootSuspect[] = [];
	const showToVisualMs = delta( tVisual , tShow );
	if( showToVisualMs != null && showToVisualMs >= MENUBAR_BOOT_SLOW_VISUAL_MS ) {
		suspects.push( 'slow-menubar-visual' );
	}
	if( tReady != null && tVisual != null && tReady < tVisual ) {
		suspects.push( 'ready-before-visual' );
	}
	if( tPhase5 != null && tVisual != null && tPhase5 < tVisual ) {
		suspects.push( 'phase5-before-visual' );
	}
	if( tWcvLoad != null && tVisual != null && tWcvLoad < tVisual ) {
		suspects.push( 'wcv-load-before-visual' );
	}
	if( tOverlay != null && tVisual != null && tOverlay < tVisual ) {
		suspects.push( 'overlay-before-visual' );
	}
	if( overlapLoadingMs >= MENUBAR_BOOT_OVERLAP_SIGNIFICANT_MS ) {
		suspects.push( 'wcv-loading-overlaps-menubar-paint' );
	}
	if( tShow != null && tDomReady != null && tShow < tDomReady ) {
		suspects.push( 'window-shown-before-menubar-dom' );
	}
	if( coversMenubar ) {
		suspects.push( 'wcv-covers-menubar' );
	}
	if( shellNotClipped ) {
		suspects.push( 'shell-not-clipped' );
	}
	if( waitTimedOut ) {
		suspects.push( 'wait-timeout' );
	}
	if( webpackAttempts != null && webpackAttempts > 1 ) {
		suspects.push( 'webpack-retry' );
	}
	if( tStructure != null && tVisual != null && tStructure > tVisual + 50 ) {
		suspects.push( 'structure-late' );
	}
	if( longtaskMsBeforeVisual >= 200 ) {
		suspects.push( 'renderer-longtask-before-visual' );
	}

	const conflict = suspects.includes( 'wcv-load-before-visual' )
		|| suspects.includes( 'phase5-before-visual' )
		|| suspects.includes( 'wcv-loading-overlaps-menubar-paint' )
		|| suspects.includes( 'wcv-covers-menubar' )
		|| suspects.includes( 'overlay-before-visual' );

	let severity : MenubarBootVerdictSeverity = 'ok';
	if( conflict ) {
		severity = 'conflict';
	} else if(
		suspects.includes( 'slow-menubar-visual' )
		|| suspects.includes( 'wait-timeout' )
		|| suspects.includes( 'webpack-retry' )
		|| suspects.includes( 'renderer-longtask-before-visual' )
	) {
		severity = 'warn';
	}

	let hint = 'menubar visual-ready 在当前 WCV 开始加载之前，未测到冲突。';
	if( severity === 'conflict' ) {
		hint = 'menu-view:ready / Phase5 / overlay 早于 menubar 首绘，当前 WCV 或 FloatingView 加载与 menubar 白屏重叠。'
			+ ' Phase5 应等 renderer-visual-ready；FloatingView 也须在其后。';
	} else if( suspects.includes( 'slow-menubar-visual' ) ) {
		hint = 'menubar 首绘本身超过 1.5s，但未测到与当前 WCV 的加载重叠；先看 webpack-retry / longtask。';
	} else if( suspects.includes( 'ready-before-visual' ) ) {
		hint = 'menu-view:ready 早于首绘（IPC 门闩 ≠ 已绘）。本次未抢到 visual 之前的 WCV 加载。';
	}

	return {
		severity ,
		suspects ,
		deltas : {
			showToVisualMs ,
			showToChromeMs : delta( tChrome , tShow ) ,
			readyToVisualMs : delta( tVisual , tReady ) ,
			readyToPhase5Ms : delta( tPhase5 , tReady ) ,
			phase5ToVisualMs : delta( tVisual , tPhase5 ) ,
			wcvLoadToVisualMs : delta( tVisual , tWcvLoad ) ,
			structureToVisualMs : delta( tVisual , tStructure ) ,
			overlapLoadingMs ,
			longtaskMsBeforeVisual : Math.round( longtaskMsBeforeVisual ),
		} ,
		marks : {
			t0 ,
			tShow ,
			tDomReady ,
			tDidFinishLoad ,
			tReady ,
			tChrome ,
			tVisual ,
			tFcp ,
			tStructure ,
			tWaitResolved ,
			tPhase5 ,
			tWcvLoad ,
			tWcvPresent ,
			waitReady ,
			waitTimedOut : waitTimedOut || null ,
			webpackAttempts ,
		} ,
		hint ,
	};
};
