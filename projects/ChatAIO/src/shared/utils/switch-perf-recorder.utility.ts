/**
 * SwitchPerformanceRecorder — AI 页面快速切换性能分析记录器
 *
 * 使用方式：
 *   主进程：import { perf } from '#src/shared/utils/switch-perf-recorder.utility';
 *           perf.mark('switch:start', { ctx: 'close' });
 *   渲染进程：同上，通过 IPC 批量发送到主进程落盘。
 *
 * 日志输出到 projects/ChatAIO/performance-logs/perf-<ISO-timestamp>.jsonl
 */

export interface PerfEvent {
	/** 事件发生的绝对时间戳 (ms, Date.now()) */
	ts: number;
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
