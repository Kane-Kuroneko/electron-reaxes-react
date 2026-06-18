/**
 * SwitchPerformanceRecorder — AI 页面快速切换性能分析记录器
 *
 * 使用方式：
 *   主进程：import { perf } from '#src/shared/utils/switch-perf-recorder.utility';
 *           perf.mark('switch:start', { ctx: 'close' });
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

	/** 生成新的上下文 ID，绑定一次完整的切换/关闭操作 */
	newCtx(): string {
		return `ctx-${ ++this.ctxSeq }-${ Date.now() }`;
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
		if( this.buffer.length >= MAX_BUFFER_SIZE && this.flushHandler ) {
			this.flushHandler( this.drain() );
		}
	}

	/** 取出当前缓冲区全部事件并清空 */
	drain(): PerfEvent[] {
		const events = this.buffer.slice();
		this.buffer = [];
		return events;
	}

	get bufferLength(): number {
		return this.buffer.length;
	}

	private flushHandler: (( events: PerfEvent[] ) => void) | null = null;

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
		perf.mark( 'switch:session-stats' , 'renderer' , '' , stats as unknown as Record<string, unknown> );
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
