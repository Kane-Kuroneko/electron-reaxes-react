/**
 * Long Animation Frames (LoAF) 观测：仅在 SwitchAiBar 可见且切换会话内订阅，
 * 结束后 disconnect，避免常驻开销。
 *
 * 参考：https://developer.chrome.com/docs/web-platform/long-animation-frames
 * Electron 自定义协议下脚本归因可能需 --enable-features=AlwaysLogLOAFURL。
 */

import { perf , PerfPhase } from '#src/shared/utils/switch-perf-recorder.utility';

type LoafEntryLike = {
	duration: number;
	blockingDuration?: number;
	renderStart?: number;
	styleAndLayoutStart?: number;
	firstUIEventTimestamp?: number;
	scripts?: Array<{
		sourceURL?: string;
		sourceFunctionName?: string;
		duration?: number;
		invoker?: string;
	}>;
};

export type LoafObserverHandle = {
	disconnect: () => void;
};

/** 截断脚本 URL，避免日志膨胀 */
function truncateUrl( url: string | undefined , max = 120 ): string | undefined {
	if( !url ) return undefined;
	return url.length > max ? `${ url.slice( 0 , max ) }…` : url;
}

/**
 * 在可见切换期间订阅 long-animation-frame，将摘要写入 perf。
 * 不支持时返回 no-op handle。
 */
export function startLoafObserver( ctxId: string ): LoafObserverHandle {
	const noop = { disconnect() { /* no-op */ } };
	if( typeof PerformanceObserver === 'undefined' ) {
		return noop;
	}
	const supported = PerformanceObserver.supportedEntryTypes || [];
	if( !supported.includes( 'long-animation-frame' ) ) {
		return noop;
	}

	let observer: PerformanceObserver | null = null;
	try {
		observer = new PerformanceObserver( ( list ) => {
			for( const entry of list.getEntries() ) {
				const loaf = entry as unknown as LoafEntryLike;
				const scripts = ( loaf.scripts || [] ).slice( 0 , 5 ).map( s => ( {
					url : truncateUrl( s.sourceURL ) ,
					fn : s.sourceFunctionName ,
					duration : s.duration ,
					invoker : s.invoker ,
				} ) );
				perf.mark( PerfPhase.SwitchLoaf , 'renderer' , ctxId , {
					duration : Math.round( loaf.duration ) ,
					blockingDuration : loaf.blockingDuration != null
						? Math.round( loaf.blockingDuration )
						: undefined ,
					scriptCount : loaf.scripts?.length ?? 0 ,
					scripts ,
				} );
			}
		} );
		observer.observe( { type : 'long-animation-frame' , buffered : false } );
	} catch {
		return noop;
	}

	return {
		disconnect() {
			try {
				observer?.disconnect();
			} catch { /* ignore */ }
			observer = null;
		},
	};
}
