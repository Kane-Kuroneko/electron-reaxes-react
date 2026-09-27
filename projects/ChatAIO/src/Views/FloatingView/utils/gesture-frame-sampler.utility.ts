/**
 * 每次可见切换采一段 rAF 帧间隔，只写摘要，不逐帧落盘。
 * 设计：docs/features/floating-view-perf-monitor.md
 */

const SAMPLE_WINDOW_MS = 800;
const DROP_FRAME_MS = 20;

type SamplerHandle = {
	stop : () => void;
};

let active : { ctxId : string; handle : SamplerHandle } | null = null;

export const startGestureFrameSampler = ( ctxId : string ) : SamplerHandle | null => {
	if( !ctxId || typeof requestAnimationFrame === 'undefined' ) {
		return null;
	}
	if( active ) {
		if( active.ctxId === ctxId ) {
			return active.handle;
		}
		active.handle.stop();
	}
	const startedAt = performance.now();
	const deltas : number[] = [];
	let lastFrame = startedAt;
	let rafId = 0;
	let timeoutId = 0 as unknown as ReturnType<typeof setTimeout>;
	let stopped = false;

	const emit = () => {
		if( stopped ) {
			return;
		}
		stopped = true;
		if( rafId ) {
			cancelAnimationFrame( rafId );
		}
		clearTimeout( timeoutId );
		const durationMs = Math.round( performance.now() - startedAt );
		const maxDelta = deltas.length ? Math.max( ...deltas ) : 0;
		const avgDelta = deltas.length
			? deltas.reduce( ( a , b ) => a + b , 0 ) / deltas.length
			: 0;
		noteFloatingViewPerf( 'renderer' , ctxId , FvPerfPhase.FrameStats , {
			durationMs ,
			frameCount : deltas.length ,
			avgFps : avgDelta > 0 ? Math.round( 1000 / avgDelta ) : 0 ,
			minFps : maxDelta > 0 ? Math.round( 1000 / maxDelta ) : 0 ,
			maxFrameDeltaMs : Math.round( maxDelta ) ,
			droppedFrames : deltas.filter( d => d > DROP_FRAME_MS ).length ,
		} );
		perf.flush();
		if( active?.ctxId === ctxId ) {
			active = null;
		}
	};

	const tick = ( now : number ) => {
		if( stopped ) {
			return;
		}
		const delta = now - lastFrame;
		if( lastFrame > 0 && delta < 500 ) {
			deltas.push( delta );
		}
		lastFrame = now;
		if( now - startedAt < SAMPLE_WINDOW_MS ) {
			rafId = requestAnimationFrame( tick );
		} else {
			emit();
		}
	};
	rafId = requestAnimationFrame( tick );
	timeoutId = setTimeout( emit , SAMPLE_WINDOW_MS + 40 );
	const handle : SamplerHandle = {
		stop() {
			clearTimeout( timeoutId );
			emit();
		} ,
	};
	active = { ctxId , handle };
	return handle;
};

import { FvPerfPhase , noteFloatingViewPerf } from '#shared/utils/floating-view-perf.utility';
import { perf } from '#shared/utils/switch-perf-recorder.utility';
