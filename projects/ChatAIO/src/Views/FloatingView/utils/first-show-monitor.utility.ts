/**
 * 冷启动后「第一次调出 FloatingView 卡片」专用采样。
 *
 * 目标：把「弹出延迟」与「动画卡顿」拆开量化：
 * - show→visibility / first-paint / css-transition-start / final-complete
 * - 窗口期内 rAF 帧间隔（掉帧、最长帧）
 * - 与后续切换对比时，看 first-show-stats 是否显著恶化
 *
 * 仅在会话内首次 visible=true 时启动；采样约 ANIM_WINDOW_MS 后汇总一条事件并停止。
 */

import { perf , PerfPhase } from '#src/shared/utils/switch-perf-recorder.utility';

const ANIM_WINDOW_MS = 700;
const DROP_FRAME_MS = 20;

export type FirstShowMonitorHandle = {
	noteCssTransitionStart: (data?: Record<string, unknown>) => void;
	noteComplete: (data: {
		realIndex: number;
		expectedActiveIndex: number;
		hadSwiperBegin: boolean;
	}) => { isFinal: boolean; premature: boolean; msFromVisible: number } | null;
	stop: () => void;
};

let sessionFirstShowStarted = false;

export function hasStartedFirstShowMonitor(): boolean {
	return sessionFirstShowStarted;
}

export function resetFirstShowMonitorForTests(): void {
	sessionFirstShowStarted = false;
}

/**
 * 启动首次调出采样。同一渲染进程会话只启动一次。
 * @returns null 表示本会话已采过（后续切换不重复）
 */
export function startFirstShowMonitor( ctxId: string ): FirstShowMonitorHandle | null {
	if( sessionFirstShowStarted ) {
		return null;
	}
	sessionFirstShowStarted = true;

	const startedAt = performance.now();
	const frameDeltas: number[] = [];
	let lastFrame = startedAt;
	let rafId = 0;
	let stopped = false;
	let cssTransitionStartAt: number | null = null;
	let firstCompleteAt: number | null = null;
	let finalCompleteAt: number | null = null;
	let prematureCompleteCount = 0;
	let finalCompleteCount = 0;

	perf.mark( PerfPhase.SwitchVisibilityVisible , 'renderer' , ctxId , {
		documentVisibility : typeof document !== 'undefined' ? document.visibilityState : 'unknown' ,
		hidden : typeof document !== 'undefined' ? document.hidden : undefined ,
	} );

	const tick = ( now: number ) => {
		if( stopped ) return;
		const delta = now - lastFrame;
		if( lastFrame > 0 && delta < 500 ) {
			frameDeltas.push( delta );
		}
		lastFrame = now;
		if( now - startedAt < ANIM_WINDOW_MS ) {
			rafId = requestAnimationFrame( tick );
		} else {
			emitStats();
		}
	};
	rafId = requestAnimationFrame( tick );

	const emitStats = () => {
		if( stopped ) return;
		stopped = true;
		if( rafId ) cancelAnimationFrame( rafId );
		const durationMs = Math.round( performance.now() - startedAt );
		const maxDelta = frameDeltas.length ? Math.max( ...frameDeltas ) : 0;
		const avgDelta = frameDeltas.length
			? frameDeltas.reduce( ( a , b ) => a + b , 0 ) / frameDeltas.length
			: 0;
		const droppedFrames = frameDeltas.filter( d => d > DROP_FRAME_MS ).length;
		perf.mark( PerfPhase.SwitchFirstShowStats , 'renderer' , ctxId , {
			durationMs ,
			frameCount : frameDeltas.length ,
			avgFps : avgDelta > 0 ? Math.round( 1000 / avgDelta ) : 0 ,
			minFps : maxDelta > 0 ? Math.round( 1000 / maxDelta ) : 0 ,
			maxFrameDeltaMs : Math.round( maxDelta ) ,
			droppedFrames ,
			msToCssTransitionStart : cssTransitionStartAt != null
				? Math.round( cssTransitionStartAt - startedAt )
				: null ,
			msToFirstComplete : firstCompleteAt != null
				? Math.round( firstCompleteAt - startedAt )
				: null ,
			msToFinalComplete : finalCompleteAt != null
				? Math.round( finalCompleteAt - startedAt )
				: null ,
			prematureCompleteCount ,
			finalCompleteCount ,
			documentVisibility : typeof document !== 'undefined' ? document.visibilityState : 'unknown' ,
		} );
		perf.flush();
	};

	/* 超时兜底：避免动画异常时永不落盘 */
	const timeoutId = setTimeout( () => emitStats() , ANIM_WINDOW_MS + 50 );

	return {
		noteCssTransitionStart( data ) {
			if( cssTransitionStartAt != null || stopped ) return;
			cssTransitionStartAt = performance.now();
			perf.mark( PerfPhase.SwitchCssTransitionStart , 'renderer' , ctxId , {
				...data ,
				msFromVisible : Math.round( cssTransitionStartAt - startedAt ) ,
			} );
		} ,
		noteComplete( { realIndex , expectedActiveIndex , hadSwiperBegin } ) {
			if( stopped ) {
				return null;
			}
			const now = performance.now();
			const isFinal = hadSwiperBegin && realIndex === expectedActiveIndex;
			if( firstCompleteAt == null ) {
				firstCompleteAt = now;
			}
			if( isFinal ) {
				finalCompleteCount += 1;
				finalCompleteAt = now;
			} else {
				prematureCompleteCount += 1;
			}
			/* 最终 complete 后稍等几帧再出汇总，捕获收尾长帧 */
			if( isFinal && finalCompleteCount === 1 ) {
				setTimeout( () => emitStats() , 80 );
			}
			return { isFinal , premature : !isFinal , msFromVisible : Math.round( now - startedAt ) };
		} ,
		stop() {
			clearTimeout( timeoutId );
			emitStats();
		},
	};
}
