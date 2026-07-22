/**
 * Performance Log Analyzer — 解析 performance-logs JSONL 并输出瓶颈报告
 *
 * 使用方法：
 *   开发分析：npx tsx projects/ChatAIO/scripts/analyze-perf-logs.ts
 *   CI 回归： npx tsx projects/ChatAIO/scripts/analyze-perf-logs.ts --ci
 *
 * 或作为模块导入：
 *   import { analyzeAllSessions , formatReport } from '.../perf-log-analyzer.utility';
 *
 * 输出目录：projects/ChatAIO/performance-logs/analysis-reports/
 *
 * 同进程内事件耗时优先使用 hrt（performance.now() 亚毫秒精度）差值；
 * 跨进程耗时退化为 ts（Date.now()）差值。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/* ═══════════════════════════════════════════════════════════════
   类型定义（与 switch-perf-recorder.utility.ts 中的 PerfEvent 对齐）
   ═══════════════════════════════════════════════════════════════ */

export interface PerfEvent {
	ts: number;
	/** 高精度相对时间戳 (performance.now())，同一进程内事件间耗时优先使用 */
	hrt?: number;
	proc: 'main' | 'renderer';
	phase: string;
	ctxId: string;
	data?: Record<string, unknown>;
}

export interface SpanDurations {
	mainOverhead?: number;              /* switch:start → switch:ipc-sent */
	ipcLatency?: number;                /* switch:ipc-sent → switch:ipc-received */
	rendererUpdate?: number;            /* switch:ipc-received → switch:ui-state-updated */
	swiperTransitions: number[];        /* 每次 swiper-begin → swiper-end (可能多次) */
	endToEnd?: number;                  /* switch:start → switch:complete */
	uiToSwiperBegin?: number;           /* switch:ui-state-updated → 首个 switch:swiper-begin */
	closeExitDuration?: number;         /* switch:close-exit-start → switch:close-exit-end */
	/** showAIView / applyVisibility 耗时 */
	aiViewMs?: number;
	/** FloatingView showInactive 耗时 */
	overlayShowMs?: number;
	/** ui-state-updated → first-paint */
	toFirstPaintMs?: number;
	/** 本次切换内 LoAF 条目数 */
	loafCount?: number;
	/** 本次切换内最大 LoAF duration (ms) */
	maxLoafMs?: number;
	/** start → 最终 complete（isFinal=true 或 begin 之后最后一次） */
	endToEndFinal?: number;
	/** 过早 complete 次数 */
	prematureCompleteCount?: number;
	/** 首次调出采样：最长帧 */
	firstShowMaxFrameDeltaMs?: number;
	/** 首次调出采样：掉帧数 */
	firstShowDroppedFrames?: number;
	/** 首次调出：visible→css transition start */
	msToCssTransitionStart?: number;
	/** 首次调出：visible→final complete */
	msToFinalComplete?: number;
	/** 是否会话内第一次真实 overlay show */
	isFirstOverlayShow?: boolean;
}

export interface SpanAnomaly {
	type:
		| 'duplicate_event'
		| 'missing_renderer_events'
		| 'event_out_of_order'
		| 'pending_queue_buildup'
		| 'close_timeout'
		| 'close_exit_timeout'
		| 'swiper_anomaly'
		| 'missing_close_exit_events'
		| 'empty_log'
		| 'animation_skipped'
		| 'swiper_remount_while_visible'
		| 'prepare_show_items_mismatch';
	severity: 'P1' | 'P2' | 'P3';
	detail: string;
}

export interface PerfSpan {
	ctxId: string;
	action: 'switch-configured' | 'switch-instantiated' | 'close' | 'unknown';
	/** 按 phase 去重后的首次事件（用于计算耗时） */
	firstByPhase: Map<string, PerfEvent>;
	/** 该 Span 全部事件（时间序） */
	allEvents: PerfEvent[];
	anomalies: SpanAnomaly[];
	durations: SpanDurations;
	viewCount?: number;
	/** 会话内是否首次切换（来自 switch:start data） */
	isFirstSwitchInSession?: boolean;
	/** 会话内第几次切换 */
	switchOrdinal?: number;
	/** 分段耗时中最大嫌疑段 */
	topBottleneck?: { segment: string; ms: number };
}

export interface SessionSummary {
	fileName: string;
	eventCount: number;
	spanCount: number;
	/** 各 action 类型的 Span 计数 */
	actionBreakdown: Record<string, number>;
	/** 各 action 类型的平均主进程耗时 (ms) */
	avgMainOverhead: Record<string, number>;
	/** 平均 Swiper 过渡耗时 (ms) */
	avgSwiperTransition: number;
	/** 平均端到端延迟 (ms) */
	avgEndToEnd: number;
	/** 平均 close 退出动画耗时 (ms) */
	avgCloseExit: number;
	anomalyCount: number;
	anomaliesByType: Record<string, number>;
}

export interface OverallStats {
	totalSessions: number;
	totalEvents: number;
	totalSpans: number;
	totalAnomalies: number;
	overallAvgMainOverhead: number;
	overallAvgIpcLatency: number;
	overallAvgSwiperTransition: number;
	overallAvgEndToEnd: number;
	overallAvgCloseExit: number;
	overallAvgAiViewMs: number;
	overallAvgOverlayShowMs: number;
	overallAvgToFirstPaintMs: number;
	/** 首次切换 vs 后续切换对比 */
	firstVsLater: FirstVsLaterComparison;
}

export interface MetricAvg {
	count: number;
	avgEndToEnd: number;
	avgMainOverhead: number;
	avgAiViewMs: number;
	avgOverlayShowMs: number;
	avgToFirstPaintMs: number;
	avgIpcLatency: number;
	avgUiToSwiperBegin: number;
	avgMaxLoafMs: number;
	avgLoafCount: number;
}

export interface FirstVsLaterComparison {
	first: MetricAvg;
	later: MetricAvg;
	/** 首次相对后续的端到端倍数（later=0 时为 null） */
	e2eRatio: number | null;
}

export interface AnalysisReport {
	analyzedAt: string;
	logDir: string;
	sessions: SessionSummary[];
	overallStats: OverallStats;
	allAnomalies: SpanAnomaly[];
	/** 主进程开销最慢的 5 个 Span */
	worstMainOverhead: PerfSpan[];
	/** Close 操作最慢的 5 个 Span */
	worstCloseOps: PerfSpan[];
	/** 挂起队列堆积最严重的 Span */
	worstQueueBuildup: PerfSpan[];
	/** Close 退出动画最慢的 Span */
	worstCloseExit: PerfSpan[];
	/** overlay show 最慢 */
	worstOverlayShow: PerfSpan[];
	/** 端到端最慢 */
	worstEndToEnd: PerfSpan[];
	/** 冷启动后首次切换 span（专项判读） */
	firstColdSwitch: PerfSpan | null;
}

/** CI 回归阈值：超出任一阈值时 analyzer 返回非零退出码 */
export const CI_THRESHOLDS = {
	/** 主进程平均开销上限 (ms) */
	maxAvgMainOverhead      : 30 ,
	/** 主进程单次操作开销上限 (ms) */
	maxSingleMainOverhead   : 100 ,
	/** Close 操作主进程上限 (ms) */
	maxCloseOverhead        : 80 ,
	/** Close 退出动画上限 (ms) */
	maxCloseExitDuration    : 1000 ,
	/** 允许的最大 P1 异常数 */
	maxP1Anomalies          : 10 ,
};

export interface CIViolation {
	metric: string;
	threshold: number;
	actual: number;
	detail: string;
}

/* ═══════════════════════════════════════════════════════════════
   工具函数
   ═══════════════════════════════════════════════════════════════ */

/**
 * 计算两个事件的耗时 (ms)。
 * 若两事件同进程且都有 hrt，优先用 hrt（亚毫秒精度）；
 * 否则用 ts（跨进程或缺少 hrt 时）。
 */
function deltaMs( a: PerfEvent , b: PerfEvent ): number {
	if( a.proc === b.proc && a.hrt !== undefined && b.hrt !== undefined ) {
		return Number( ( b.hrt - a.hrt ).toFixed( 3 ) );
	}
	return b.ts - a.ts;
}

/* ═══════════════════════════════════════════════════════════════
   核心解析
   ═══════════════════════════════════════════════════════════════ */

/** 解析单个 JSONL 文件，返回有效事件数组 */
export function parseLogFile( filePath: string ): PerfEvent[] {
	const content = fs.readFileSync( filePath , 'utf-8' );
	const lines = content.trim().split( '\n' ).filter( l => l.trim() );
	const events: PerfEvent[] = [];

	for( const line of lines ) {
		try {
			const event = JSON.parse( line ) as PerfEvent;
			if( typeof event.ts === 'number' && event.ctxId && event.phase ) {
				events.push( event );
			}
		} catch {
			/* 跳过损坏的行 */
		}
	}

	return events;
}

/** 将事件按 ctxId 分组为 Span */
export function groupIntoSpans( events: PerfEvent[] ): PerfSpan[] {
	const groups = new Map<string , PerfEvent[]>();

	for( const event of events ) {
		if( !groups.has( event.ctxId ) ) {
			groups.set( event.ctxId , [] );
		}
		groups.get( event.ctxId )!.push( event );
	}

	/* 对每组内的事件按时间戳排序 */
	const spans: PerfSpan[] = [];
	for( const [ ctxId , ctxEvents ] of groups ) {
		/* 稳定的时间序排列（同 ts 时保序） */
		const sorted = ctxEvents.slice().sort( ( a , b ) => a.ts - b.ts );
		const span = buildSpan( ctxId , sorted );
		spans.push( span );
	}

	return spans;
}

/* ═══════════════════════════════════════════════════════════════
   Span 构建 & 指标计算
   ═══════════════════════════════════════════════════════════════ */

function buildSpan( ctxId: string , events: PerfEvent[] ): PerfSpan {
	const firstByPhase = new Map<string , PerfEvent>();
	const anomalies: SpanAnomaly[] = [];
	const seenPhases = new Map<string , number>();

	for( const event of events ) {
		const count = ( seenPhases.get( event.phase ) || 0 ) + 1;
		seenPhases.set( event.phase , count );

		/* 仅保留首次出现的 phase 用于耗时计算 */
		if( !firstByPhase.has( event.phase ) ) {
			firstByPhase.set( event.phase , event );
		}
	}

	/* 检测重复事件（允许同一 Span 内多次出现的 phase） */
	const ALLOW_MULTI = new Set( [
		'switch:loaf' ,
		'switch:swiper-begin' ,
		'switch:swiper-end' ,
		'switch:active-index-changed' ,
		'switch:complete' ,
		'switch:swiper-remount' ,
	] );
	for( const [ phase , count ] of seenPhases ) {
		if( count > 1 && !ALLOW_MULTI.has( phase ) ) {
			anomalies.push( {
				type    : 'duplicate_event' ,
				severity : 'P2' ,
				detail   : `Phase "${ phase }" 出现 ${ count } 次（Span: ${ ctxId })`,
			} );
		}
	}

	/* 提取 action */
	const action = extractAction( firstByPhase );

	/* 检测缺失渲染进程事件（boot-* 为 FloatingView 主进程生命周期，不要求 renderer） */
	const hasMain = events.some( e => e.proc === 'main' );
	const hasRenderer = events.some( e => e.proc === 'renderer' );
	const isBootSpan = ctxId.startsWith( 'boot-' );
	if( hasMain && !hasRenderer && !isBootSpan ) {
		anomalies.push( {
			type     : 'missing_renderer_events' ,
			severity : 'P1' ,
			detail   : `Span ${ ctxId } 仅有主进程事件，缺少渲染进程数据（FloatingView 可能未显示）`,
		} );
	}

	/* 计算耗时 */
	const durations = computeDurations( firstByPhase , events , anomalies , action );
	const startData = firstByPhase.get( 'switch:start' )?.data;
	const isFirstSwitchInSession = typeof startData?.isFirstSwitchInSession === 'boolean'
		? startData.isFirstSwitchInSession
		: undefined;
	const switchOrdinal = typeof startData?.switchOrdinal === 'number'
		? Number( startData.switchOrdinal )
		: undefined;

	/* 动画被跳过：有 complete / ui 更新但无 swiper-begin（首次 remount 典型形态） */
	const isSwitchAction = action === 'switch-configured' || action === 'switch-instantiated';
	if(
		isSwitchAction
		&& firstByPhase.has( 'switch:complete' )
		&& firstByPhase.has( 'switch:ui-state-updated' )
		&& !firstByPhase.has( 'switch:swiper-begin' )
	) {
		anomalies.push( {
			type     : 'animation_skipped' ,
			severity : 'P1' ,
			detail   : `Span ${ ctxId } 有 switch:complete 但无 switch:swiper-begin（动画被跳过；常见于可见期 Swiper 重建）`,
		} );
	}

	const remountWhileVisible = events.filter(
		e => e.phase === 'switch:swiper-remount' && e.data?.visible === true,
	);
	if( remountWhileVisible.length > 0 ) {
		const sample = remountWhileVisible[0];
		anomalies.push( {
			type     : 'swiper_remount_while_visible' ,
			severity : 'P1' ,
			detail   : `Span ${ ctxId } 在 visible=true 时重建 Swiper（${ sample.data?.prevTotal }→${ sample.data?.nextTotal }，共 ${ remountWhileVisible.length } 次）`,
		} );
	}

	return {
		ctxId ,
		action ,
		firstByPhase ,
		allEvents : events ,
		anomalies ,
		durations ,
		viewCount : extractViewCount( firstByPhase ) ,
		isFirstSwitchInSession ,
		switchOrdinal ,
		topBottleneck : pickTopBottleneck( durations ),
	};
}

function pickTopBottleneck( durations: SpanDurations ): PerfSpan['topBottleneck'] {
	const candidates: Array<{ segment: string; ms: number }> = [];
	if( durations.aiViewMs != null ) candidates.push( { segment : 'aiViewMs' , ms : durations.aiViewMs } );
	if( durations.overlayShowMs != null ) candidates.push( { segment : 'overlayShowMs' , ms : durations.overlayShowMs } );
	if( durations.ipcLatency != null ) candidates.push( { segment : 'ipcLatency' , ms : durations.ipcLatency } );
	if( durations.toFirstPaintMs != null ) candidates.push( { segment : 'toFirstPaintMs' , ms : durations.toFirstPaintMs } );
	if( durations.uiToSwiperBegin != null ) candidates.push( { segment : 'uiToSwiperBegin' , ms : durations.uiToSwiperBegin } );
	if( durations.maxLoafMs != null ) candidates.push( { segment : 'maxLoafMs' , ms : durations.maxLoafMs } );
	const swiperSum = durations.swiperTransitions.reduce( ( a , b ) => a + b , 0 );
	if( swiperSum > 0 ) candidates.push( { segment : 'swiperTransitionsSum' , ms : swiperSum } );
	if( candidates.length === 0 ) return undefined;
	return candidates.sort( ( a , b ) => b.ms - a.ms )[0];
}

function extractAction( firstByPhase: Map<string , PerfEvent> ): PerfSpan['action'] {
	const startEvent = firstByPhase.get( 'switch:start' );
	if( !startEvent?.data?.action ) return 'unknown';
	const action = String( startEvent.data.action );
	if( action === 'switch-configured' || action === 'switch-instantiated' || action === 'close' ) {
		return action;
	}
	return 'unknown';
}

function extractViewCount( firstByPhase: Map<string , PerfEvent> ): number | undefined {
	const startEvent = firstByPhase.get( 'switch:start' );
	if( startEvent?.data?.viewCount ) {
		return Number( startEvent.data.viewCount );
	}
	return undefined;
}

function computeDurations(
	firstByPhase: Map<string , PerfEvent> ,
	events: PerfEvent[] ,
	anomalies: SpanAnomaly[] ,
	action: string,
): SpanDurations {
	const durations: SpanDurations = {
		swiperTransitions : [],
	};

	const start = firstByPhase.get( 'switch:start' );
	const ipcSent = firstByPhase.get( 'switch:ipc-sent' );
	const ipcReceived = firstByPhase.get( 'switch:ipc-received' );
	const uiUpdated = firstByPhase.get( 'switch:ui-state-updated' );
	const complete = firstByPhase.get( 'switch:complete' );
	const closeExitStart = firstByPhase.get( 'switch:close-exit-start' );
	const closeExitEnd = firstByPhase.get( 'switch:close-exit-end' );
	const aiViewBegin = firstByPhase.get( 'switch:ai-view-begin' );
	const aiViewEnd = firstByPhase.get( 'switch:ai-view-end' );
	const fvShowBegin = firstByPhase.get( 'fv:show-begin' );
	const fvShowEnd = firstByPhase.get( 'fv:show-end' );
	const firstPaint = firstByPhase.get( 'switch:first-paint' );

	/* Main 进程开销（同进程，优先 hrt） */
	if( start && ipcSent ) {
		durations.mainOverhead = deltaMs( start , ipcSent );
	}

	/* AI View 切换耗时 */
	if( aiViewBegin && aiViewEnd ) {
		durations.aiViewMs = deltaMs( aiViewBegin , aiViewEnd );
	}

	/* Overlay showInactive 耗时 */
	if( fvShowBegin && fvShowEnd ) {
		durations.overlayShowMs = deltaMs( fvShowBegin , fvShowEnd );
	}

	/* IPC 延迟（跨进程，只能用 ts） */
	if( ipcSent && ipcReceived ) {
		durations.ipcLatency = ipcReceived.ts - ipcSent.ts;
	}

	/* 渲染器状态更新（同进程，优先 hrt） */
	if( ipcReceived && uiUpdated ) {
		durations.rendererUpdate = deltaMs( ipcReceived , uiUpdated );
	}

	/* UI 更新到首帧 / Swiper 开始 */
	if( uiUpdated && firstPaint ) {
		durations.toFirstPaintMs = deltaMs( uiUpdated , firstPaint );
	}
	const swiperBegins = events.filter( e => e.phase === 'switch:swiper-begin' );
	if( uiUpdated && swiperBegins.length > 0 ) {
		durations.uiToSwiperBegin = deltaMs( uiUpdated , swiperBegins[0] );
	}

	/* LoAF 汇总 */
	const loafEvents = events.filter( e => e.phase === 'switch:loaf' );
	if( loafEvents.length > 0 ) {
		durations.loafCount = loafEvents.length;
		durations.maxLoafMs = Math.max(
			...loafEvents.map( e => Number( e.data?.duration ?? 0 ) ),
		);
	}

	/* Swiper 过渡耗时：优先匹配 begin 之后的非 premature end */
	const sortedEvents = [ ...events ].sort( ( a , b ) => a.ts - b.ts );
	let pendingBegin: PerfEvent | null = null;
	for( const event of sortedEvents ) {
		if( event.phase === 'switch:swiper-begin' ) {
			pendingBegin = event;
		} else if( event.phase === 'switch:swiper-end' && pendingBegin ) {
			/* 跳过 begin 之前的过早 end（loopFix） */
			if( event.data?.premature === true && event.data?.isFinal !== true ) {
				continue;
			}
			const duration = deltaMs( pendingBegin , event );
			durations.swiperTransitions.push( duration );
			if( duration < 50 ) {
				anomalies.push( {
					type     : 'swiper_anomaly' ,
					severity : 'P2' ,
					detail   : `Swiper 过渡仅 ${ duration }ms（过短，可能是空过渡或 loopFix）`,
				} );
			} else if( duration > 500 ) {
				anomalies.push( {
					type     : 'swiper_anomaly' ,
					severity : 'P2' ,
					detail   : `Swiper 过渡 ${ duration }ms（超出设计值 300ms）`,
				} );
			}
			pendingBegin = null;
		}
	}

	/* 端到端：优先最终 complete，避免过早 transitionEnd 把首次 E2E 算成十几 ms */
	const completes = events.filter( e => e.phase === 'switch:complete' );
	const finalComplete = [ ...completes ].reverse().find( e => e.data?.isFinal === true )
		|| ( swiperBegins.length > 0
			? [ ...completes ].reverse().find( e => e.ts >= swiperBegins[0].ts )
			: undefined )
		|| completes[completes.length - 1]
		|| complete;
	if( start && finalComplete ) {
		durations.endToEnd = finalComplete.ts - start.ts;
		durations.endToEndFinal = durations.endToEnd;
	}
	durations.prematureCompleteCount = completes.filter(
		e => e.data?.premature === true || e.data?.isFinal === false,
	).length;

	const showBegin = fvShowBegin;
	if( showBegin?.data?.isFirstOverlayShow === true ) {
		durations.isFirstOverlayShow = true;
	}

	const firstShowStats = firstByPhase.get( 'switch:first-show-stats' );
	if( firstShowStats?.data ) {
		const d = firstShowStats.data;
		if( typeof d.maxFrameDeltaMs === 'number' ) {
			durations.firstShowMaxFrameDeltaMs = Number( d.maxFrameDeltaMs );
		}
		if( typeof d.droppedFrames === 'number' ) {
			durations.firstShowDroppedFrames = Number( d.droppedFrames );
		}
		if( typeof d.msToCssTransitionStart === 'number' ) {
			durations.msToCssTransitionStart = Number( d.msToCssTransitionStart );
		}
		if( typeof d.msToFinalComplete === 'number' ) {
			durations.msToFinalComplete = Number( d.msToFinalComplete );
		}
	}

	/* Close 退出动画耗时（同进程，优先 hrt） */
	if( closeExitStart && closeExitEnd ) {
		durations.closeExitDuration = deltaMs( closeExitStart , closeExitEnd );
		/* 退出动画超时检测 */
		if( durations.closeExitDuration > 500 ) {
			anomalies.push( {
				type     : 'close_exit_timeout' ,
				severity : 'P2' ,
				detail   : `Close 退出动画耗时 ${ durations.closeExitDuration }ms（目标 < 500ms）`,
			} );
		}
	} else if( action === 'close' && closeExitStart && !closeExitEnd ) {
		/* 有 close-exit-start 但无 close-exit-end：Swiper 重建可能被跳过 */
		anomalies.push( {
			type     : 'missing_close_exit_events' ,
			severity : 'P2' ,
			detail   : `Close 操作有 close-exit-start 但缺少 close-exit-end（FloatingView 可能在 Swiper 挂载前隐藏）`,
		} );
	}

	/* Close 超时检测 */
	if( action === 'close' && durations.mainOverhead && durations.mainOverhead > 80 ) {
		anomalies.push( {
			type     : 'close_timeout' ,
			severity : 'P1' ,
			detail   : `Close 操作主进程耗时 ${ durations.mainOverhead }ms（阈值 80ms）`,
		} );
	}

	/* 挂起队列堆积检测 */
	const pendingRemainingValues = events
		.filter( e => e.data?.pendingRemaining !== undefined )
		.map( e => Number( e.data!.pendingRemaining ) );
	const maxPending = pendingRemainingValues.length > 0 ? Math.max( ...pendingRemainingValues ) : 0;
	if( maxPending > 2 ) {
		anomalies.push( {
			type     : 'pending_queue_buildup' ,
			severity : 'P2' ,
			detail   : `挂起步骤队列峰值 ${ maxPending } 步（用户切换速度快于 Swiper 过渡速度）`,
		} );
	}

	return durations;
}

/* ═══════════════════════════════════════════════════════════════
   Session 分析
   ═══════════════════════════════════════════════════════════════ */

/** 分析单个日志文件，返回 Session 摘要 */
export function analyzeSession( filePath: string ): SessionSummary {
	const fileName = path.basename( filePath );
	const events = parseLogFile( filePath );

	/* 空日志检测 */
	if( events.length === 0 ) {
		return {
			fileName ,
			eventCount         : 0 ,
			spanCount          : 0 ,
			actionBreakdown    : {} ,
			avgMainOverhead    : {} ,
			avgSwiperTransition : 0 ,
			avgEndToEnd        : 0 ,
			avgCloseExit       : 0 ,
			anomalyCount       : 0 ,
			anomaliesByType    : {},
		};
	}

	const spans = groupIntoSpans( events );

	/* 按 action 分组统计 */
	const actionGroups = new Map<string , PerfSpan[]>();
	for( const span of spans ) {
		if( !actionGroups.has( span.action ) ) {
			actionGroups.set( span.action , [] );
		}
		actionGroups.get( span.action )!.push( span );
	}

	const actionBreakdown: Record<string , number> = {};
	const avgMainOverhead: Record<string , number> = {};
	for( const [ act , actionSpans ] of actionGroups ) {
		actionBreakdown[act] = actionSpans.length;
		const overheads = actionSpans
			.map( s => s.durations.mainOverhead )
			.filter( ( n ): n is number => n !== undefined );
		avgMainOverhead[act] = overheads.length > 0
			? Number( ( overheads.reduce( ( a , b ) => a + b , 0 ) / overheads.length ).toFixed( 1 ) )
			: 0;
	}

	/* 平均 Swiper 过渡耗时 */
	const allSwiperDurations = spans.flatMap( s => s.durations.swiperTransitions );
	const avgSwiperTransition = allSwiperDurations.length > 0
		? Number( ( allSwiperDurations.reduce( ( a , b ) => a + b , 0 ) / allSwiperDurations.length ).toFixed( 1 ) )
		: 0;

	/* 平均端到端延迟 */
	const e2eDurations = spans
		.map( s => s.durations.endToEnd )
		.filter( ( n ): n is number => n !== undefined );
	const avgEndToEnd = e2eDurations.length > 0
		? Number( ( e2eDurations.reduce( ( a , b ) => a + b , 0 ) / e2eDurations.length ).toFixed( 1 ) )
		: 0;

	/* 平均 close 退出动画耗时 */
	const closeExitDurations = spans
		.map( s => s.durations.closeExitDuration )
		.filter( ( n ): n is number => n !== undefined );
	const avgCloseExit = closeExitDurations.length > 0
		? Number( ( closeExitDurations.reduce( ( a , b ) => a + b , 0 ) / closeExitDurations.length ).toFixed( 1 ) )
		: 0;

	/* 汇总异常 */
	const allAnomalies = spans.flatMap( s => s.anomalies );
	const anomaliesByType: Record<string , number> = {};
	for( const a of allAnomalies ) {
		anomaliesByType[a.type] = ( anomaliesByType[a.type] || 0 ) + 1;
	}

	return {
		fileName ,
		eventCount         : events.length ,
		spanCount          : spans.length ,
		actionBreakdown    ,
		avgMainOverhead    ,
		avgSwiperTransition ,
		avgEndToEnd        ,
		avgCloseExit       ,
		anomalyCount       : allAnomalies.length ,
		anomaliesByType    ,
	};
}

/* ═══════════════════════════════════════════════════════════════
   全量分析
   ═══════════════════════════════════════════════════════════════ */

export interface AnalyzeSessionsOptions {
	/** 只分析最新一条非 fixture 日志 */
	latestOnly?: boolean;
	/** 跳过 perf-fixture-*（默认 true） */
	skipFixtures?: boolean;
}

/** 列出目录中可分析的 perf JSONL（按文件名排序） */
export function listPerfLogFiles(
	logDir: string ,
	options: AnalyzeSessionsOptions = {},
): string[] {
	const skipFixtures = options.skipFixtures !== false;
	if( !fs.existsSync( logDir ) ) {
		return [];
	}
	let files = fs.readdirSync( logDir )
		.filter( f => f.startsWith( 'perf-' ) && f.endsWith( '.jsonl' ) )
		.filter( f => !( skipFixtures && f.startsWith( 'perf-fixture-' ) ) )
		.map( f => path.join( logDir , f ) )
		.sort();
	if( options.latestOnly && files.length > 0 ) {
		files = [ files[files.length - 1] ];
	}
	return files;
}

/** 同文件内：prepare fingerprint 与首次 switch show 是否一致 */
function detectPrepareShowMismatch( events: PerfEvent[] ): SpanAnomaly | null {
	const prepare = [ ...events ].reverse().find(
		e => e.phase === 'fv:prepare-applied' || e.phase === 'fv:prepare-sent',
	);
	const firstShow = events.find(
		e => e.phase === 'switch:ui-state-updated' && e.ctxId?.startsWith( 'ctx-' ),
	);
	if( !prepare?.data || !firstShow?.data ) {
		return null;
	}
	const prepHash = prepare.data.idsHash;
	const showHash = firstShow.data.idsHash;
	const prepCount = prepare.data.itemCount;
	const showCount = firstShow.data.itemCount;
	if( prepHash == null || showHash == null ) {
		/* 旧日志无 fingerprint：退化为 itemCount */
		if( prepCount != null && showCount != null && Number( prepCount ) !== Number( showCount ) ) {
			return {
				type     : 'prepare_show_items_mismatch' ,
				severity : 'P2' ,
				detail   : `prepare itemCount=${ prepCount } 与首次 show itemCount=${ showCount } 不一致（可能导致可见期 Swiper 重建）`,
			};
		}
		return null;
	}
	if( String( prepHash ) !== String( showHash ) || Number( prepCount ) !== Number( showCount ) ) {
		return {
			type     : 'prepare_show_items_mismatch' ,
			severity : 'P2' ,
			detail   : `prepare(idsHash=${ prepHash },n=${ prepCount },source=${ prepare.data.source }) ≠ 首次 show(idsHash=${ showHash },n=${ showCount },source=${ firstShow.data.source })——prepare 与切换列表不同源`,
		};
	}
	return null;
}

/** 分析 performance-logs 目录下的日志，返回完整报告 */
export function analyzeAllSessions(
	logDir: string ,
	options: AnalyzeSessionsOptions = {},
): AnalysisReport {
	const files = listPerfLogFiles( logDir , options );

	const sessions: SessionSummary[] = [];
	const allSpans: PerfSpan[] = [];
	const sessionAnomalies: SpanAnomaly[] = [];

	for( const file of files ) {
		const summary = analyzeSession( file );
		sessions.push( summary );

		if( summary.eventCount > 0 ) {
			const events = parseLogFile( file );
			const mismatch = detectPrepareShowMismatch( events );
			if( mismatch ) {
				sessionAnomalies.push( {
					...mismatch ,
					detail : `[${ path.basename( file ) }] ${ mismatch.detail }`,
				} );
			}
			const spans = groupIntoSpans( events );
			allSpans.push( ...spans );
		}
	}

	/* 整体统计 */
	const spanAnomalies = allSpans.flatMap( s => s.anomalies );
	const allAnomalies = [ ...spanAnomalies , ...sessionAnomalies ];
	const totalEvents = sessions.reduce( ( sum , s ) => sum + s.eventCount , 0 );
	const totalAnomalies = allAnomalies.length;

	const allMainOverheads = allSpans
		.map( s => s.durations.mainOverhead )
		.filter( ( n ): n is number => n !== undefined );
	const overallAvgMainOverhead = allMainOverheads.length > 0
		? Number( ( allMainOverheads.reduce( ( a , b ) => a + b , 0 ) / allMainOverheads.length ).toFixed( 1 ) )
		: 0;

	const allIpcLatencies = allSpans
		.map( s => s.durations.ipcLatency )
		.filter( ( n ): n is number => n !== undefined );
	const overallAvgIpcLatency = allIpcLatencies.length > 0
		? Number( ( allIpcLatencies.reduce( ( a , b ) => a + b , 0 ) / allIpcLatencies.length ).toFixed( 1 ) )
		: 0;

	const allSwiperAll = allSpans.flatMap( s => s.durations.swiperTransitions );
	const overallAvgSwiperTransition = allSwiperAll.length > 0
		? Number( ( allSwiperAll.reduce( ( a , b ) => a + b , 0 ) / allSwiperAll.length ).toFixed( 1 ) )
		: 0;

	const allE2E = allSpans
		.map( s => s.durations.endToEnd )
		.filter( ( n ): n is number => n !== undefined );
	const overallAvgEndToEnd = allE2E.length > 0
		? Number( ( allE2E.reduce( ( a , b ) => a + b , 0 ) / allE2E.length ).toFixed( 1 ) )
		: 0;

	const allCloseExit = allSpans
		.map( s => s.durations.closeExitDuration )
		.filter( ( n ): n is number => n !== undefined );
	const overallAvgCloseExit = allCloseExit.length > 0
		? Number( ( allCloseExit.reduce( ( a , b ) => a + b , 0 ) / allCloseExit.length ).toFixed( 1 ) )
		: 0;

	const allAiView = allSpans
		.map( s => s.durations.aiViewMs )
		.filter( ( n ): n is number => n !== undefined );
	const overallAvgAiViewMs = allAiView.length > 0
		? Number( ( allAiView.reduce( ( a , b ) => a + b , 0 ) / allAiView.length ).toFixed( 1 ) )
		: 0;

	const allOverlayShow = allSpans
		.map( s => s.durations.overlayShowMs )
		.filter( ( n ): n is number => n !== undefined );
	const overallAvgOverlayShowMs = allOverlayShow.length > 0
		? Number( ( allOverlayShow.reduce( ( a , b ) => a + b , 0 ) / allOverlayShow.length ).toFixed( 1 ) )
		: 0;

	const allFirstPaint = allSpans
		.map( s => s.durations.toFirstPaintMs )
		.filter( ( n ): n is number => n !== undefined );
	const overallAvgToFirstPaintMs = allFirstPaint.length > 0
		? Number( ( allFirstPaint.reduce( ( a , b ) => a + b , 0 ) / allFirstPaint.length ).toFixed( 1 ) )
		: 0;

	/* 最慢的 Span */
	const withMainOverhead = [ ...allSpans ]
		.filter( s => s.durations.mainOverhead !== undefined )
		.sort( ( a , b ) => ( b.durations.mainOverhead! ) - ( a.durations.mainOverhead! ) );
	const worstMainOverhead = withMainOverhead.slice( 0 , 5 );

	const worstCloseOps = [ ...allSpans ]
		.filter( s => s.action === 'close' && s.durations.mainOverhead !== undefined )
		.sort( ( a , b ) => ( b.durations.mainOverhead! ) - ( a.durations.mainOverhead! ) )
		.slice( 0 , 5 );

	/* 挂起队列堆积最严重的 Span：按 swiperTransitions 数量排序 */
	const worstQueueBuildup = [ ...allSpans ]
		.filter( s => s.durations.swiperTransitions.length > 1 )
		.sort( ( a , b ) => b.durations.swiperTransitions.length - a.durations.swiperTransitions.length )
		.slice( 0 , 5 );

	/* Close 退出动画最慢的 Span */
	const worstCloseExit = [ ...allSpans ]
		.filter( s => s.durations.closeExitDuration !== undefined )
		.sort( ( a , b ) => ( b.durations.closeExitDuration! ) - ( a.durations.closeExitDuration! ) )
		.slice( 0 , 5 );

	const worstOverlayShow = [ ...allSpans ]
		.filter( s => s.durations.overlayShowMs !== undefined )
		.sort( ( a , b ) => ( b.durations.overlayShowMs! ) - ( a.durations.overlayShowMs! ) )
		.slice( 0 , 5 );

	const worstEndToEnd = [ ...allSpans ]
		.filter( s => s.durations.endToEnd !== undefined )
		.sort( ( a , b ) => ( b.durations.endToEnd! ) - ( a.durations.endToEnd! ) )
		.slice( 0 , 5 );

	const switchSpans = allSpans.filter(
		s => s.action === 'switch-configured' || s.action === 'switch-instantiated',
	);
	const firstVsLater = compareFirstVsLater( switchSpans );
	const firstColdSwitch = switchSpans.find( s => s.isFirstSwitchInSession === true )
		|| switchSpans.find( s => s.durations.isFirstOverlayShow === true )
		|| null;

	return {
		analyzedAt        : new Date().toISOString() ,
		logDir ,
		sessions ,
		overallStats      : {
			totalSessions              : sessions.length ,
			totalEvents                : totalEvents ,
			totalSpans                 : allSpans.length ,
			totalAnomalies             : totalAnomalies ,
			overallAvgMainOverhead      ,
			overallAvgIpcLatency        ,
			overallAvgSwiperTransition  ,
			overallAvgEndToEnd          ,
			overallAvgCloseExit         ,
			overallAvgAiViewMs ,
			overallAvgOverlayShowMs ,
			overallAvgToFirstPaintMs ,
			firstVsLater ,
		} ,
		allAnomalies ,
		worstMainOverhead ,
		worstCloseOps ,
		worstQueueBuildup ,
		worstCloseExit ,
		worstOverlayShow ,
		worstEndToEnd ,
		firstColdSwitch ,
	};
}

function avgOf( values: number[] ): number {
	if( values.length === 0 ) return 0;
	return Number( ( values.reduce( ( a , b ) => a + b , 0 ) / values.length ).toFixed( 1 ) );
}

function summarizeMetricAvg( spans: PerfSpan[] ): MetricAvg {
	return {
		count : spans.length ,
		avgEndToEnd : avgOf( spans.map( s => s.durations.endToEnd ).filter( ( n ): n is number => n !== undefined ) ) ,
		avgMainOverhead : avgOf( spans.map( s => s.durations.mainOverhead ).filter( ( n ): n is number => n !== undefined ) ) ,
		avgAiViewMs : avgOf( spans.map( s => s.durations.aiViewMs ).filter( ( n ): n is number => n !== undefined ) ) ,
		avgOverlayShowMs : avgOf( spans.map( s => s.durations.overlayShowMs ).filter( ( n ): n is number => n !== undefined ) ) ,
		avgToFirstPaintMs : avgOf( spans.map( s => s.durations.toFirstPaintMs ).filter( ( n ): n is number => n !== undefined ) ) ,
		avgIpcLatency : avgOf( spans.map( s => s.durations.ipcLatency ).filter( ( n ): n is number => n !== undefined ) ) ,
		avgUiToSwiperBegin : avgOf( spans.map( s => s.durations.uiToSwiperBegin ).filter( ( n ): n is number => n !== undefined ) ) ,
		avgMaxLoafMs : avgOf( spans.map( s => s.durations.maxLoafMs ).filter( ( n ): n is number => n !== undefined ) ) ,
		avgLoafCount : avgOf( spans.map( s => s.durations.loafCount ).filter( ( n ): n is number => n !== undefined ) ) ,
	};
}

function compareFirstVsLater( switchSpans: PerfSpan[] ): FirstVsLaterComparison {
	const first = switchSpans.filter( s => s.isFirstSwitchInSession === true || s.switchOrdinal === 1 );
	const later = switchSpans.filter( s => !( s.isFirstSwitchInSession === true || s.switchOrdinal === 1 ) );
	/* 若无显式标记，按时间序把每个 session 文件内首个 switch 当 first——此处已在 span 级标记，兜底用 ordinal 缺失时全进 later */
	const firstAvg = summarizeMetricAvg( first );
	const laterAvg = summarizeMetricAvg( later );
	const e2eRatio = laterAvg.avgEndToEnd > 0 && firstAvg.count > 0
		? Number( ( firstAvg.avgEndToEnd / laterAvg.avgEndToEnd ).toFixed( 2 ) )
		: null;
	return { first : firstAvg , later : laterAvg , e2eRatio };
}

/* ═══════════════════════════════════════════════════════════════
   CI 回归检测
   ═══════════════════════════════════════════════════════════════ */

/** 检查分析报告是否超过 CI 阈值，返回违规项列表 */
export function checkCIThresholds( report: AnalysisReport ): CIViolation[] {
	const violations: CIViolation[] = [];
	const { overallStats } = report;

	if( overallStats.overallAvgMainOverhead > CI_THRESHOLDS.maxAvgMainOverhead ) {
		violations.push( {
			metric    : 'avgMainOverhead' ,
			threshold : CI_THRESHOLDS.maxAvgMainOverhead ,
			actual    : overallStats.overallAvgMainOverhead ,
			detail    : `平均主进程开销 ${ overallStats.overallAvgMainOverhead }ms > 阈值 ${ CI_THRESHOLDS.maxAvgMainOverhead }ms`,
		} );
	}

	/* 检查最慢的单次操作 */
	const maxSingle = report.worstMainOverhead[0];
	if( maxSingle && maxSingle.durations.mainOverhead && maxSingle.durations.mainOverhead > CI_THRESHOLDS.maxSingleMainOverhead ) {
		violations.push( {
			metric    : 'maxSingleMainOverhead' ,
			threshold : CI_THRESHOLDS.maxSingleMainOverhead ,
			actual    : maxSingle.durations.mainOverhead ,
			detail    : `单次操作主进程耗时 ${ maxSingle.durations.mainOverhead }ms > 阈值 ${ CI_THRESHOLDS.maxSingleMainOverhead }ms（${ maxSingle.ctxId })`,
		} );
	}

	/* 检查 close 操作 */
	const maxClose = report.worstCloseOps[0];
	if( maxClose && maxClose.durations.mainOverhead && maxClose.durations.mainOverhead > CI_THRESHOLDS.maxCloseOverhead ) {
		violations.push( {
			metric    : 'maxCloseOverhead' ,
			threshold : CI_THRESHOLDS.maxCloseOverhead ,
			actual    : maxClose.durations.mainOverhead ,
			detail    : `Close 操作主进程耗时 ${ maxClose.durations.mainOverhead }ms > 阈值 ${ CI_THRESHOLDS.maxCloseOverhead }ms（${ maxClose.ctxId })`,
		} );
	}

	/* 检查 close 退出动画 */
	if( overallStats.overallAvgCloseExit > CI_THRESHOLDS.maxCloseExitDuration ) {
		violations.push( {
			metric    : 'avgCloseExit' ,
			threshold : CI_THRESHOLDS.maxCloseExitDuration ,
			actual    : overallStats.overallAvgCloseExit ,
			detail    : `Close 退出动画平均 ${ overallStats.overallAvgCloseExit }ms > 阈值 ${ CI_THRESHOLDS.maxCloseExitDuration }ms`,
		} );
	}

	/* 检查 P1 异常数 */
	const p1Count = report.allAnomalies.filter( a => a.severity === 'P1' ).length;
	if( p1Count > CI_THRESHOLDS.maxP1Anomalies ) {
		violations.push( {
			metric    : 'p1Anomalies' ,
			threshold : CI_THRESHOLDS.maxP1Anomalies ,
			actual    : p1Count ,
			detail    : `P1 异常 ${ p1Count } 个 > 阈值 ${ CI_THRESHOLDS.maxP1Anomalies } 个`,
		} );
	}

	return violations;
}

/* ═══════════════════════════════════════════════════════════════
   报告格式化
   ═══════════════════════════════════════════════════════════════ */

/** 将分析报告格式化为 Markdown */
export function formatReport( report: AnalysisReport ): string {
	const {
		overallStats , sessions , allAnomalies , worstMainOverhead , worstCloseOps ,
		worstQueueBuildup , worstCloseExit , worstOverlayShow , worstEndToEnd ,
	} = report;

	const p1Count = allAnomalies.filter( a => a.severity === 'P1' ).length;
	const p2Count = allAnomalies.filter( a => a.severity === 'P2' ).length;
	const p3Count = allAnomalies.filter( a => a.severity === 'P3' ).length;
	const { firstVsLater } = overallStats;

	let md = '';

	md += `# Performance Log 分析报告\n\n`;
	md += `> 分析时间：${ report.analyzedAt }\n`;
	md += `> 日志目录：${ report.logDir }\n\n`;

	/* ── 总体概览 ── */
	md += `## 1. 总体概览\n\n`;
	md += `| 指标 | 值 |\n`;
	md += `|------|----|\n`;
	md += `| 分析 Session 数 | ${ overallStats.totalSessions } |\n`;
	md += `| 总事件数 | ${ overallStats.totalEvents } |\n`;
	md += `| 总操作数 (Span) | ${ overallStats.totalSpans } |\n`;
	md += `| 异常总数 | ${ overallStats.totalAnomalies }（P1: ${ p1Count }, P2: ${ p2Count }, P3: ${ p3Count }）|\n`;
	md += `| 平均主进程开销 | **${ overallStats.overallAvgMainOverhead }ms** |\n`;
	md += `| 平均 AI View 切换 | ${ overallStats.overallAvgAiViewMs }ms |\n`;
	md += `| 平均 Overlay show | ${ overallStats.overallAvgOverlayShowMs }ms |\n`;
	md += `| 平均 IPC 延迟 | ${ overallStats.overallAvgIpcLatency }ms |\n`;
	md += `| 平均 toFirstPaint | ${ overallStats.overallAvgToFirstPaintMs }ms |\n`;
	md += `| 平均 Swiper 过渡 | ${ overallStats.overallAvgSwiperTransition }ms |\n`;
	md += `| 平均端到端延迟 | ${ overallStats.overallAvgEndToEnd }ms |\n`;
	md += `| 平均 Close 退出动画 | ${ overallStats.overallAvgCloseExit }ms |\n\n`;

	/* ── 首次 vs 后续 ── */
	md += `## 1.1 首次切换 vs 后续切换\n\n`;
	md += `| 指标 | 首次 (n=${ firstVsLater.first.count }) | 后续 (n=${ firstVsLater.later.count }) |\n`;
	md += `|------|------|------|\n`;
	md += `| 端到端 | ${ firstVsLater.first.avgEndToEnd }ms | ${ firstVsLater.later.avgEndToEnd }ms |\n`;
	md += `| 主进程开销 | ${ firstVsLater.first.avgMainOverhead }ms | ${ firstVsLater.later.avgMainOverhead }ms |\n`;
	md += `| AI View | ${ firstVsLater.first.avgAiViewMs }ms | ${ firstVsLater.later.avgAiViewMs }ms |\n`;
	md += `| Overlay show | ${ firstVsLater.first.avgOverlayShowMs }ms | ${ firstVsLater.later.avgOverlayShowMs }ms |\n`;
	md += `| IPC | ${ firstVsLater.first.avgIpcLatency }ms | ${ firstVsLater.later.avgIpcLatency }ms |\n`;
	md += `| toFirstPaint | ${ firstVsLater.first.avgToFirstPaintMs }ms | ${ firstVsLater.later.avgToFirstPaintMs }ms |\n`;
	md += `| ui→swiperBegin | ${ firstVsLater.first.avgUiToSwiperBegin }ms | ${ firstVsLater.later.avgUiToSwiperBegin }ms |\n`;
	md += `| max LoAF | ${ firstVsLater.first.avgMaxLoafMs }ms | ${ firstVsLater.later.avgMaxLoafMs }ms |\n`;
	md += `| LoAF 次数 | ${ firstVsLater.first.avgLoafCount } | ${ firstVsLater.later.avgLoafCount } |\n`;
	if( firstVsLater.e2eRatio != null ) {
		md += `\n> 首次端到端 / 后续端到端 = **${ firstVsLater.e2eRatio }x**\n`;
	}
	md += `\n`;

	/* ── 冷启动首次调出专项 ── */
	md += `## 1.2 冷启动首次调出专项\n\n`;
	md += `判读优先级：\`msToFinalComplete\` / \`firstShowMaxFrameDeltaMs\` / \`maxLoAF\` 相对后续是否异常；\n`;
	md += `\`overlayShowMs\` 若很小则延迟不在 showInactive 本身。\n\n`;
	if( report.firstColdSwitch ) {
		const d = report.firstColdSwitch.durations;
		md += `| 指标 | 值 |\n|------|----|\n`;
		md += `| ctxId | ${ report.firstColdSwitch.ctxId } |\n`;
		md += `| isFirstOverlayShow | ${ d.isFirstOverlayShow ?? '-' } |\n`;
		md += `| E2E(最终 complete) | ${ d.endToEnd ?? '-' }ms |\n`;
		md += `| Overlay show | ${ d.overlayShowMs ?? '-' }ms |\n`;
		md += `| toFirstPaint | ${ d.toFirstPaintMs ?? '-' }ms |\n`;
		md += `| ui→swiperBegin | ${ d.uiToSwiperBegin ?? '-' }ms |\n`;
		md += `| msToCssTransitionStart | ${ d.msToCssTransitionStart ?? '-' }ms |\n`;
		md += `| msToFinalComplete | ${ d.msToFinalComplete ?? '-' }ms |\n`;
		md += `| firstShow maxFrameDelta | ${ d.firstShowMaxFrameDeltaMs ?? '-' }ms |\n`;
		md += `| firstShow droppedFrames | ${ d.firstShowDroppedFrames ?? '-' } |\n`;
		md += `| max LoAF | ${ d.maxLoafMs ?? '-' }ms |\n`;
		md += `| prematureCompleteCount | ${ d.prematureCompleteCount ?? '-' } |\n\n`;
	} else {
		md += `_本次报告未捕获首次切换（请冷启动后点 menubar Prev/Next 一次，再连切 2～3 次，然后 --latest）。_\n\n`;
	}

	/* ── Session 摘要 ── */
	md += `## 2. Session 摘要\n\n`;
	md += `| 文件 | 事件数 | Span 数 | Switch | Close | 主进程平均 | Swiper 平均 | E2E 平均 | CloseExit 平均 | 异常 |\n`;
	md += `|------|--------|---------|--------|-------|-----------|------------|---------|---------------|------|\n`;
	for( const s of sessions ) {
		const switchCount = ( s.actionBreakdown['switch-configured'] || 0 ) + ( s.actionBreakdown['switch-instantiated'] || 0 );
		const closeCount = s.actionBreakdown['close'] || 0;
		const mainAvg = s.avgMainOverhead['switch-instantiated'] || s.avgMainOverhead['switch-configured'] || 0;
		md += `| ${ s.fileName } | ${ s.eventCount } | ${ s.spanCount } | ${ switchCount } | ${ closeCount } | ${ mainAvg }ms | ${ s.avgSwiperTransition }ms | ${ s.avgEndToEnd }ms | ${ s.avgCloseExit }ms | ${ s.anomalyCount } |\n`;
	}
	md += `\n`;

	/* ── 异常清单 ── */
	if( allAnomalies.length > 0 ) {
		md += `## 3. 异常清单\n\n`;

		if( p1Count > 0 ) {
			md += `### P1 异常（需立即处理）\n\n`;
			const p1Anomalies = allAnomalies.filter( a => a.severity === 'P1' );
			const shown = p1Anomalies.slice( 0 , 25 );
			for( const a of shown ) {
				md += `- **[${ a.type }]** ${ a.detail }\n`;
			}
			if( p1Anomalies.length > 25 ) {
				md += `- ... 另有 ${ p1Anomalies.length - 25 } 条 P1 异常，详见 JSON 报告\n`;
			}
			md += `\n`;
		}

		if( p2Count > 0 ) {
			md += `### P2 异常（建议处理）\n\n`;
			const p2Types = new Map<string , number>();
			const p2Anomalies = allAnomalies.filter( a => a.severity === 'P2' );
			for( const a of p2Anomalies ) {
				p2Types.set( a.type , ( p2Types.get( a.type ) || 0 ) + 1 );
			}
			for( const [ type , count ] of p2Types ) {
				md += `- **${ type }**: ${ count } 次\n`;
			}
			md += `\n`;
		}
	}

	/* ── 重点 Span ── */
	if( worstEndToEnd.length > 0 ) {
		md += `## 4. 端到端最慢操作 (Top ${ worstEndToEnd.length })\n\n`;
		md += `| ctxId | Action | E2E | Top 瓶颈 | Overlay | AI View | FirstPaint | First? |\n`;
		md += `|-------|--------|-----|----------|---------|---------|------------|--------|\n`;
		for( const span of worstEndToEnd ) {
			const bn = span.topBottleneck
				? `${ span.topBottleneck.segment }=${ span.topBottleneck.ms }ms`
				: '-';
			md += `| ${ span.ctxId } | ${ span.action } | **${ span.durations.endToEnd }ms** | ${ bn } | ${ span.durations.overlayShowMs ?? '-' } | ${ span.durations.aiViewMs ?? '-' } | ${ span.durations.toFirstPaintMs ?? '-' } | ${ span.isFirstSwitchInSession ?? '-' } |\n`;
		}
		md += `\n`;
	}

	if( worstOverlayShow.length > 0 ) {
		md += `## 4.1 Overlay show 最慢 (Top ${ worstOverlayShow.length })\n\n`;
		md += `| ctxId | Overlay show | wasHidden? | First? |\n`;
		md += `|-------|--------------|------------|--------|\n`;
		for( const span of worstOverlayShow ) {
			const showBegin = span.firstByPhase.get( 'fv:show-begin' );
			md += `| ${ span.ctxId } | **${ span.durations.overlayShowMs }ms** | ${ showBegin?.data?.overlayWasHidden ?? '-' } | ${ span.isFirstSwitchInSession ?? '-' } |\n`;
		}
		md += `\n`;
	}

	if( worstMainOverhead.length > 0 ) {
		md += `## 5. 主进程最慢操作 (Top ${ worstMainOverhead.length })\n\n`;
		md += `| ctxId | Action | 主进程耗时 | View 数 |\n`;
		md += `|-------|--------|-----------|--------|\n`;
		for( const span of worstMainOverhead ) {
			md += `| ${ span.ctxId } | ${ span.action } | **${ span.durations.mainOverhead }ms** | ${ span.viewCount ?? '-' } |\n`;
		}
		md += `\n`;
	}

	if( worstCloseOps.length > 0 ) {
		md += `## 6. Close 操作最慢 (Top ${ worstCloseOps.length })\n\n`;
		md += `| ctxId | 主进程耗时 | View 数 |\n`;
		md += `|-------|-----------|--------|\n`;
		for( const span of worstCloseOps ) {
			md += `| ${ span.ctxId } | **${ span.durations.mainOverhead }ms** | ${ span.viewCount ?? '-' } |\n`;
		}
		md += `\n`;
	}

	if( worstCloseExit.length > 0 ) {
		md += `## 7. Close 退出动画最慢 (Top ${ worstCloseExit.length })\n\n`;
		md += `| ctxId | 退出动画耗时 | View 数 |\n`;
		md += `|-------|-------------|--------|\n`;
		for( const span of worstCloseExit ) {
			md += `| ${ span.ctxId } | **${ span.durations.closeExitDuration }ms** | ${ span.viewCount ?? '-' } |\n`;
		}
		md += `\n`;
	}

	if( worstQueueBuildup.length > 0 ) {
		md += `## 8. 挂起队列堆积 (Top ${ worstQueueBuildup.length })\n\n`;
		md += `| ctxId | Action | Swiper 过渡次数 | 总 Swiper 耗时 |\n`;
		md += `|-------|--------|----------------|---------------|\n`;
		for( const span of worstQueueBuildup ) {
			const totalSwiper = span.durations.swiperTransitions.reduce( ( a , b ) => a + b , 0 );
			md += `| ${ span.ctxId } | ${ span.action } | ${ span.durations.swiperTransitions.length } | ${ totalSwiper }ms |\n`;
		}
		md += `\n`;
	}

	/* ── 建议 ── */
	md += `## 9. 建议\n\n`;
	const suggestions = generateSuggestions( report );
	for( const s of suggestions ) {
		md += `- ${ s }\n`;
	}

	return md;
}

function generateSuggestions( report: AnalysisReport ): string[] {
	const suggestions: string[] = [];
	const { overallStats } = report;
	const { firstVsLater } = overallStats;

	if( firstVsLater.e2eRatio != null && firstVsLater.e2eRatio >= 1.5 ) {
		suggestions.push(
			`**首次切换明显慢于后续**（${ firstVsLater.e2eRatio }x）。对比首次/后续的 Overlay show、AI View、toFirstPaint 哪一段拉大差距。`,
		);
	}

	if( overallStats.overallAvgOverlayShowMs > 16 ) {
		suggestions.push(
			`**Overlay showInactive 偏慢**（平均 ${ overallStats.overallAvgOverlayShowMs }ms）。嫌疑：透明窗合成器冷启动；可考虑更强预热或 contentTracing 确认 compositor。`,
		);
	}

	if( overallStats.overallAvgAiViewMs > 30 ) {
		suggestions.push(
			`**AI View 切换偏慢**（平均 ${ overallStats.overallAvgAiViewMs }ms）。嫌疑：WebContentsView 显隐/ remount 阻塞 overlay 显示。`,
		);
	}

	if( overallStats.overallAvgToFirstPaintMs > 50 ) {
		suggestions.push(
			`**toFirstPaint 偏慢**（平均 ${ overallStats.overallAvgToFirstPaintMs }ms）。嫌疑：FloatingView 渲染树 / Swiper 挂载或首帧合成。`,
		);
	}

	if( firstVsLater.first.avgMaxLoafMs > 50 || firstVsLater.later.avgMaxLoafMs > 50 ) {
		suggestions.push(
			`**检测到 Long Animation Frames**。动画期主线程被长任务打断；查看 switch:loaf / switch:first-show-stats（Electron 可加 --enable-features=AlwaysLogLOAFURL）。`,
		);
	}

	const cold = report.firstColdSwitch?.durations;
	if( cold?.firstShowMaxFrameDeltaMs != null && cold.firstShowMaxFrameDeltaMs > 50 ) {
		suggestions.push(
			`**冷启动首次调出帧间隔过大**（maxFrameDelta=${ cold.firstShowMaxFrameDeltaMs }ms）。嫌疑：透明窗首次合成 / 首帧布局 thrash，而非后续切换路径。`,
		);
	}
	if( cold?.maxLoafMs != null && cold.maxLoafMs > 100 && ( firstVsLater.later.avgMaxLoafMs || 0 ) < 50 ) {
		suggestions.push(
			`**仅首次存在显著 LoAF**（${ cold.maxLoafMs }ms vs 后续 ~${ firstVsLater.later.avgMaxLoafMs }ms）。聚焦首次 show 后 700ms 内的 FloatingView 主线程工作。`,
		);
	}

	const hasAnimationSkipped = report.allAnomalies.some( a => a.type === 'animation_skipped' );
	if( hasAnimationSkipped ) {
		suggestions.push(
			`**动画被跳过**（有 complete 无 swiper-begin）。通常是可见期 Swiper 重建：检查 prepare 与 show 的 items 是否同源（instantiated vs configured）。`,
		);
	}

	const hasRemountVisible = report.allAnomalies.some( a => a.type === 'swiper_remount_while_visible' );
	if( hasRemountVisible ) {
		suggestions.push(
			`**可见期 Swiper 重建**。SwitchAiBar 的 items.length 在显示时变化会强制 remount，入场滑动会被吃掉。`,
		);
	}

	const hasPrepareMismatch = report.allAnomalies.some( a => a.type === 'prepare_show_items_mismatch' );
	if( hasPrepareMismatch ) {
		suggestions.push(
			`**prepare 与首次 show 列表不一致**。启动预热应与 menubar Prev/Next（instantiated）使用同一 runtime 列表。`,
		);
	}

	if( overallStats.overallAvgMainOverhead > 20 ) {
		suggestions.push( `**主进程开销偏高**（${ overallStats.overallAvgMainOverhead }ms > 目标 20ms）。建议排查 \`applyVisibility()\` 和 \`fitWindow()\` 的冗余调用。` );
	}

	if( overallStats.overallAvgIpcLatency > 5 ) {
		suggestions.push( `**IPC 延迟偏高**（${ overallStats.overallAvgIpcLatency }ms > 目标 5ms）。检查是否有大型 payload 通过 IPC 传输。` );
	}

	const hasMissingRenderer = report.allAnomalies.some( a => a.type === 'missing_renderer_events' );
	if( hasMissingRenderer ) {
		suggestions.push( `**渲染进程事件缺失**。多个 Span 仅有主进程数据，检查 FloatingView 是否在操作期间正确显示并接收 IPC 命令。` );
	}

	const hasDuplicates = report.allAnomalies.some( a => a.type === 'duplicate_event' );
	if( hasDuplicates ) {
		suggestions.push( `**存在重复性能事件**。检查 Swiper loop 模式下的 \`onTransitionEnd\` 是否仍有重复触发（已加入去重逻辑但需验证）。` );
	}

	const hasCloseTimeout = report.allAnomalies.some( a => a.type === 'close_timeout' );
	if( hasCloseTimeout ) {
		suggestions.push( `**Close 操作超时**。销毁 WebContentsView 操作耗时过高，考虑是否需要异步化或优化视图销毁流程。` );
	}

	const hasCloseExitTimeout = report.allAnomalies.some( a => a.type === 'close_exit_timeout' );
	if( hasCloseExitTimeout ) {
		suggestions.push( `**Close 退出动画超时**。Swiper 重建耗时过高，检查 loop clone 数量和动画性能。` );
	}

	if( suggestions.length === 0 ) {
		suggestions.push( `当前性能指标在目标范围内，继续保持监控。` );
	}

	return suggestions;
}

/* ═══════════════════════════════════════════════════════════════
   便捷入口：分析并输出报告到文件
   ═══════════════════════════════════════════════════════════════ */

/** 运行完整分析流程：扫描日志 → 分析 → 输出 Markdown 报告 → 输出 JSON 数据 */
export function runAnalysis(
	logDir: string ,
	outputDir: string ,
	options: AnalyzeSessionsOptions = {},
): { mdPath: string; jsonPath: string } {
	if( !fs.existsSync( outputDir ) ) {
		fs.mkdirSync( outputDir , { recursive : true } );
	}

	const report = analyzeAllSessions( logDir , options );

	const mdContent = formatReport( report );
	const timestamp = new Date().toISOString().replace( /:/g , '-' ).replace( /\..+/ , '' );
	const mdPath = path.join( outputDir , `analysis-${ timestamp }.md` );
	fs.writeFileSync( mdPath , mdContent , 'utf-8' );

	const jsonPath = path.join( outputDir , `analysis-${ timestamp }.json` );
	fs.writeFileSync( jsonPath , JSON.stringify( report , null , '\t' ) , 'utf-8' );

	console.log( `[PerfAnalyzer] Report written to:\n  ${ mdPath }\n  ${ jsonPath }` );

	return { mdPath , jsonPath };
}
