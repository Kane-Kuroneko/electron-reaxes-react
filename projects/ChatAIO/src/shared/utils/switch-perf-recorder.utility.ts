/**
 * SwitchPerformanceRecorder — AI 页面快速切换性能分析记录器
 *
 * 使用方式：
 *   主进程：import { perf , PerfPhase } from '#src/shared/utils/switch-perf-recorder.utility';
 *           perf.mark(PerfPhase.SwitchStart, 'main', ctxId, { action: 'switch-configured' });
 *   渲染进程：同上，通过 IPC 批量发送到主进程落盘。
 *
 * 日志输出到 projects/ChatAIO/performance-logs/perf-<ISO-timestamp>.jsonl
 *
 * PerfEvent 中 ts 为 Date.now()（毫秒级绝对时间），hrt 为 performance.now()（亚毫秒级
 * 单调时钟）。同一进程内的事件间耗时优先使用 hrt 差值；跨进程耗时仍用 ts（因为各进程
 * performance.now() 基准时刻不同）。
 */

export interface PerfEvent {
	/** 事件发生的绝对时间戳 (ms, Date.now()) */
	ts: number;
	/** 高精度相对时间戳 (performance.now(), 亚毫秒精度)。
	    同一进程内的事件可用 hrt 差值精确计算耗时。 */
	hrt?: number;
	/** 进程标识 */
	proc: 'main' | 'renderer';
	/** 事件阶段 */
	phase: string;
	/** 关联 ID（同一次切换共享同一 ctxId） */
	ctxId: string;
	/** 附加上下文 */
	data?: Record<string, unknown>;
}

/**
 * 稳定 phase 名：启动预热用 boot-* ctx；单次切换沿用 ctx-*。
 * 分析器与埋点均应引用此常量，避免字符串散落。
 */
export const PerfPhase = {
	/* ── FloatingView 启动 / 预热 ── */
	FvInitStart       : 'fv:init-start' ,
	FvInitCreated     : 'fv:init-created' ,
	FvDidFinishLoad   : 'fv:did-finish-load' ,
	FvWarmupShow      : 'fv:warmup-show' ,
	FvWarmupHide      : 'fv:warmup-hide' ,
	FvPrepareSent     : 'fv:prepare-sent' ,
	FvPrepareApplied  : 'fv:prepare-applied' ,
	FvSwiperMounted   : 'fv:swiper-mounted' ,
	/* ── 单次切换分段 ── */
	SwitchStart       : 'switch:start' ,
	SwitchAiViewBegin : 'switch:ai-view-begin' ,
	SwitchAiViewEnd   : 'switch:ai-view-end' ,
	FvShowBegin       : 'fv:show-begin' ,
	FvShowEnd         : 'fv:show-end' ,
	SwitchIpcSent     : 'switch:ipc-sent' ,
	SwitchIpcReceived : 'switch:ipc-received' ,
	SwitchUiUpdated   : 'switch:ui-state-updated' ,
	SwitchFirstPaint  : 'switch:first-paint' ,
	SwitchActiveIndex : 'switch:active-index-changed' ,
	SwitchSwiperBegin : 'switch:swiper-begin' ,
	SwitchSwiperEnd   : 'switch:swiper-end' ,
	SwitchComplete    : 'switch:complete' ,
	SwitchLoaf        : 'switch:loaf' ,
	SwitchSessionStats: 'switch:session-stats' ,
	SwitchRenderDone  : 'switch:render-done' ,
	/** Swiper 因 items.length 变化强制重建 */
	SwitchSwiperRemount : 'switch:swiper-remount' ,
	/**
	 * 冷启动后「第一次真正把 overlay 从 hidden→shown」专用。
	 * 与 isFirstSwitchInSession 不同：后者是第一次切换操作，本标记聚焦合成器/首显。
	 */
	FvFirstOverlayShow : 'fv:first-overlay-show' ,
	/** renderer：document 变为可见 / bar 变为 visible 后的可见性确认 */
	SwitchVisibilityVisible : 'switch:visibility-visible' ,
	/** CSS/Swiper transition 真正开始（wrapper transform 变化后的首帧） */
	SwitchCssTransitionStart : 'switch:css-transition-start' ,
	/** 首次调出窗口期内的帧采样汇总（非逐帧刷屏） */
	SwitchFirstShowStats : 'switch:first-show-stats' ,
} as const;

export type PerfPhaseName = typeof PerfPhase[keyof typeof PerfPhase];

/** SwitchAiBar 列表来源：用于 prepare/show fingerprint 对比 */
export type SwitchAiBarItemsSource =
	| 'configured'
	| 'instantiated'
	| 'prepare-instantiated'
	| 'prepare-configured'
	| 'unknown';

/** 稳定短哈希：对比 prepare 与 show 的 items 是否同构 */
export function hashSwitchAiBarItemIds( ids: string[] ): string {
	let h = 2166136261;
	for( const id of ids ) {
		for( let i = 0 ; i < id.length ; i++ ) {
			h ^= id.charCodeAt( i );
			h = Math.imul( h , 16777619 );
		}
		h ^= 0x7c;
		h = Math.imul( h , 16777619 );
	}
	return ( h >>> 0 ).toString( 16 ).padStart( 8 , '0' );
}

export function switchAiBarItemsFingerprint(
	items: Array<{ id: string }> ,
	source: SwitchAiBarItemsSource = 'unknown',
): { itemCount: number; idsHash: string; source: SwitchAiBarItemsSource } {
	const ids = items.map( i => i.id );
	return {
		itemCount : ids.length ,
		idsHash : hashSwitchAiBarItemIds( ids ) ,
		source ,
	};
}

const MAX_BUFFER_SIZE = 200;

/** 安全获取 performance.now()，兼容无 performance 全局的环境 */
function safeNow(): number | undefined {
	try {
		if( typeof performance !== 'undefined' && typeof performance.now === 'function' ) {
			return performance.now();
		}
	} catch { /* 忽略 */ }
	return undefined;
}

export class SwitchPerformanceRecorder {
	private buffer: PerfEvent[] = [];
	private ctxSeq = 0;
	private bootSeq = 0;
	/** 进程内已完成的切换次数；用于标记 isFirstSwitchInSession */
	private switchCountInSession = 0;
	private flushHandler: (( events: PerfEvent[] ) => void) | null = null;

	/** 生成新的上下文 ID，绑定一次完整的切换/关闭操作 */
	newCtx(): string {
		return `ctx-${ ++this.ctxSeq }-${ Date.now() }`;
	}

	/** 启动 / FloatingView 预热专用 ctx */
	newBootCtx(): string {
		return `boot-${ ++this.bootSeq }-${ Date.now() }`;
	}

	/**
	 * 标记一次用户切换即将开始，返回是否为会话内首次切换。
	 * 应在 switch:start 之前调用（主进程）。
	 */
	beginSwitchInSession(): { isFirstSwitchInSession: boolean; switchOrdinal: number } {
		this.switchCountInSession += 1;
		return {
			isFirstSwitchInSession : this.switchCountInSession === 1 ,
			switchOrdinal : this.switchCountInSession ,
		};
	}

	getSwitchCountInSession(): number {
		return this.switchCountInSession;
	}

	/** 记录一个性能事件 */
	mark( phase: string , proc: 'main' | 'renderer' , ctxId: string , data?: Record<string, unknown> ): void {
		this.buffer.push( {
			ts  : Date.now() ,
			hrt : safeNow() ,
			proc ,
			phase ,
			ctxId ,
			data ,
		} );
		/* 超出缓冲区立即触发 flush（由外部注入的 flush handler 处理） */
		if( this.buffer.length >= MAX_BUFFER_SIZE ) {
			this.flush();
		}
	}

	/** 取出当前缓冲区全部事件并清空 */
	drain(): PerfEvent[] {
		const events = this.buffer.slice();
		this.buffer = [];
		return events;
	}

	/** 立即 flush 缓冲（complete / 关键节点后调用，避免等 5s 定时器） */
	flush(): void {
		if( !this.flushHandler || this.buffer.length === 0 ) {
			return;
		}
		this.flushHandler( this.drain() );
	}

	get bufferLength(): number {
		return this.buffer.length;
	}

	/** 注册 flush 处理器（主进程设为写入文件，渲染进程设为 IPC 发送） */
	onFlush( handler: ( events: PerfEvent[] ) => void ): void {
		this.flushHandler = handler;
	}
}

/** 全局单例 */
export const perf = new SwitchPerformanceRecorder();

/* ═══════════════════════════════════════════════════════════════
   SwitchScenarioProfiler — 针对切换 AI View 场景的运行时性能采集

   在渲染进程中使用 rAF 采样帧率，统计切换操作期间的：
   - 帧率（FPS）下降
   - rapid-jump 触发次数
   - pending 队列最大深度
   - 单次切换端到端延迟
   ═══════════════════════════════════════════════════════════════ */

export class SwitchScenarioProfiler {
	private sampling = false;
	private rafId: number | null = null;
	private lastFrameTime = 0;
	private frameDeltas: number[] = [];
	private rapidJumpCount = 0;
	private maxPendingDepth = 0;
	private sessionStartTime = 0;

	/** 开始一次切换场景采样（在首次切换触发时调用） */
	startSession(): void {
		if( this.sampling ) return;
		this.sampling = true;
		this.frameDeltas = [];
		this.rapidJumpCount = 0;
		this.maxPendingDepth = 0;
		this.sessionStartTime = safeNow() ?? Date.now();
		this.lastFrameTime = this.sessionStartTime;
		this.scheduleFrame();
	}

	/** 结束采样并返回统计摘要 */
	endSession(): SwitchSessionStats | null {
		if( !this.sampling ) return null;
		this.sampling = false;
		if( this.rafId !== null ) {
			cancelAnimationFrame( this.rafId );
			this.rafId = null;
		}
		const duration = ( safeNow() ?? Date.now() ) - this.sessionStartTime;
		const stats = this.computeStats( duration );
		/* 将统计信息作为 perf event 记录 */
		perf.mark( PerfPhase.SwitchSessionStats , 'renderer' , '' , stats as unknown as Record<string, unknown> );
		return stats;
	}

	/** 记录一次 rapid-jump 触发 */
	recordRapidJump(): void {
		this.rapidJumpCount++;
	}

	/** 记录当前 pending 队列深度（取最大值） */
	recordPendingDepth( depth: number ): void {
		if( depth > this.maxPendingDepth ) {
			this.maxPendingDepth = depth;
		}
	}

	get isActive(): boolean {
		return this.sampling;
	}

	private scheduleFrame(): void {
		if( !this.sampling ) return;
		if( typeof requestAnimationFrame === 'undefined' ) return;
		this.rafId = requestAnimationFrame( ( now ) => {
			if( !this.sampling ) return;
			const delta = now - this.lastFrameTime;
			/* 忽略首帧（无前一帧参考）和异常长帧（>200ms 通常是 tab 切走） */
			if( this.lastFrameTime > 0 && delta < 200 ) {
				this.frameDeltas.push( delta );
			}
			this.lastFrameTime = now;
			this.scheduleFrame();
		} );
	}

	private computeStats( durationMs: number ): SwitchSessionStats {
		const totalFrames = this.frameDeltas.length;
		let avgFps = 0;
		let minFps = 0;
		let droppedFrames = 0;

		if( totalFrames > 0 ) {
			const avgDelta = this.frameDeltas.reduce( ( a , b ) => a + b , 0 ) / totalFrames;
			avgFps = Math.round( 1000 / avgDelta );
			const maxDelta = Math.max( ...this.frameDeltas );
			minFps = Math.round( 1000 / maxDelta );
			/* 掉帧：帧间隔 > 20ms (低于 50fps) */
			droppedFrames = this.frameDeltas.filter( d => d > 20 ).length;
		}

		return {
			durationMs : Math.round( durationMs ) ,
			totalFrames ,
			avgFps ,
			minFps ,
			droppedFrames ,
			rapidJumpCount : this.rapidJumpCount ,
			maxPendingDepth : this.maxPendingDepth,
		};
	}
}

export interface SwitchSessionStats {
	/** 采样持续时间 (ms) */
	durationMs: number;
	/** 采样总帧数 */
	totalFrames: number;
	/** 平均帧率 */
	avgFps: number;
	/** 最低瞬时帧率 */
	minFps: number;
	/** 掉帧数（帧间隔 > 20ms） */
	droppedFrames: number;
	/** rapid-jump 触发次数 */
	rapidJumpCount: number;
	/** pending 队列最大深度 */
	maxPendingDepth: number;
}

/** 渲染进程全局 profiler 实例 */
export const switchProfiler = new SwitchScenarioProfiler();
