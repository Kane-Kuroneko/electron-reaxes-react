/**
 * FloatingView 正式包性能 / 使用轨迹埋点。只观察，不改切换与轮播。
 * 设计：docs/features/floating-view-perf-monitor.md
 */

export const FV_PERF_PHASE_PREFIX = 'fv-perf:';

export const FvPerfPhase = {
	Trigger : 'fv-perf:trigger' ,
	Skipped : 'fv-perf:skipped' ,
	AiViewBegin : 'fv-perf:ai-view-begin' ,
	AiViewEnd : 'fv-perf:ai-view-end' ,
	IpcSent : 'fv-perf:ipc-sent' ,
	IpcReceived : 'fv-perf:ipc-received' ,
	Prepare : 'fv-perf:prepare' ,
	UiUpdated : 'fv-perf:ui-updated' ,
	OverlayShow : 'fv-perf:overlay-show' ,
	OverlayHide : 'fv-perf:overlay-hide' ,
	Remount : 'fv-perf:swiper-remount' ,
	ActiveIndex : 'fv-perf:active-index' ,
	SwiperBegin : 'fv-perf:swiper-begin' ,
	FirstPaint : 'fv-perf:first-paint' ,
	CssTransitionStart : 'fv-perf:css-transition-start' ,
	SwiperEnd : 'fv-perf:swiper-end' ,
	Complete : 'fv-perf:complete' ,
	Loaf : 'fv-perf:loaf' ,
	FrameStats : 'fv-perf:frame-stats' ,
} as const;

export type FvPerfPhaseName = typeof FvPerfPhase[keyof typeof FvPerfPhase];

/** 用户手势。menu-select / next / prev 是正式包排查的主路径。 */
export type FvPerfTrigger =
	| 'menu-select'
	| 'next'
	| 'prev'
	| 'next-opened'
	| 'prev-opened'
	| 'close';

export type FvPerfListSource =
	| 'configured'
	| 'instantiated'
	| 'prepare-configured'
	| 'prepare-instantiated'
	| 'unknown';

export type FvPerfMeta = {
	trigger : FvPerfTrigger;
	triggerTs : number;
	seq : number;
	fromAiId : string;
	fromIndex : number;
	toAiId : string;
	toIndex : number;
};

export type FvPerfGesture = FvPerfMeta & {
	ctxId : string;
	itemCount : number;
	listSource : FvPerfListSource;
};

export type BeginFvPerfInput = {
	trigger : FvPerfTrigger;
	fromAiId : string;
	toAiId : string;
	fromIndex : number;
	toIndex : number;
	itemCount : number;
	listSource : FvPerfListSource;
	fromLabel? : string;
	toLabel? : string;
	overlayIntent? : 'show' | 'hide';
	ctxId? : string;
	extra? : Record<string , unknown>;
};

const MAX_GESTURE_MAP = 80;
const gestureByCtx = new Map<string , FvPerfGesture>();
const completedCtx = new Set<string>();
let seq = 0;
let lastTriggerTs = 0;
let rendererBound : FvPerfGesture | null = null;

const rememberGesture = ( gesture : FvPerfGesture ) => {
	gestureByCtx.set( gesture.ctxId , gesture );
	while( gestureByCtx.size > MAX_GESTURE_MAP ) {
		const oldest = gestureByCtx.keys().next().value;
		if( !oldest ) {
			break;
		}
		gestureByCtx.delete( oldest );
		completedCtx.delete( oldest );
	}
};

export const isFvPerfPhase = ( phase : string ) => {
	return phase.startsWith( FV_PERF_PHASE_PREFIX );
};

export const lookupFvPerfGesture = ( ctxId : string ) => {
	return gestureByCtx.get( ctxId ) || null;
};

export const fvTriggerFromStep = (
	direction : 'next' | 'previous' ,
	list : 'configured' | 'instantiated' ,
) : FvPerfTrigger => {
	if( list === 'instantiated' ) {
		return direction === 'next' ? 'next-opened' : 'prev-opened';
	}
	return direction === 'next' ? 'next' : 'prev';
};

export const toFvPerfMeta = ( gesture : FvPerfGesture ) : FvPerfMeta => {
	return {
		trigger : gesture.trigger ,
		triggerTs : gesture.triggerTs ,
		seq : gesture.seq ,
		fromAiId : gesture.fromAiId ,
		fromIndex : gesture.fromIndex ,
		toAiId : gesture.toAiId ,
		toIndex : gesture.toIndex ,
	};
};

export const bindRendererFvPerf = ( gesture : FvPerfGesture ) => {
	rememberGesture( gesture );
	rendererBound = gesture;
};

export const bindRendererFvPerfFromPayload = (
	ctxId : string | undefined ,
	meta : FvPerfMeta | undefined ,
) => {
	if( !ctxId || !meta ) {
		return null;
	}
	const existing = lookupFvPerfGesture( ctxId );
	const gesture : FvPerfGesture = existing || {
		ctxId ,
		itemCount : 0 ,
		listSource : 'unknown' ,
		...meta ,
	};
	bindRendererFvPerf( gesture );
	return gesture;
};

export const beginFloatingViewGesture = (
	proc : 'main' | 'renderer' ,
	input : BeginFvPerfInput ,
) : FvPerfGesture => {
	const triggerTs = Date.now();
	const ctxId = input.ctxId || perf.newCtx();
	seq += 1;
	const intervalMs = lastTriggerTs > 0 ? triggerTs - lastTriggerTs : null;
	lastTriggerTs = triggerTs;
	const gesture : FvPerfGesture = {
		ctxId ,
		seq ,
		triggerTs ,
		trigger : input.trigger ,
		fromAiId : input.fromAiId ,
		fromIndex : input.fromIndex ,
		toAiId : input.toAiId ,
		toIndex : input.toIndex ,
		itemCount : input.itemCount ,
		listSource : input.listSource ,
	};
	rememberGesture( gesture );
	if( proc === 'renderer' ) {
		rendererBound = gesture;
	}
	perf.mark( FvPerfPhase.Trigger , proc , ctxId , {
		seq ,
		trigger : input.trigger ,
		triggerTs ,
		intervalMs ,
		fromAiId : input.fromAiId ,
		toAiId : input.toAiId ,
		fromLabel : input.fromLabel ,
		toLabel : input.toLabel ,
		fromIndex : input.fromIndex ,
		toIndex : input.toIndex ,
		itemCount : input.itemCount ,
		listSource : input.listSource ,
		overlayIntent : input.overlayIntent ,
		msFromTrigger : 0 ,
		...( input.extra || {} ) ,
	} );
	perf.flush();
	return gesture;
};

export const noteFloatingViewPerf = (
	proc : 'main' | 'renderer' ,
	ctxId : string ,
	phase : string ,
	data? : Record<string , unknown> ,
) => {
	if( !ctxId ) {
		return;
	}
	const gesture = lookupFvPerfGesture( ctxId )
		|| ( rendererBound && rendererBound.ctxId === ctxId ? rendererBound : null );
	const triggerTs = gesture?.triggerTs;
	perf.mark( phase , proc , ctxId , {
		seq : gesture?.seq ,
		trigger : gesture?.trigger ,
		msFromTrigger : typeof triggerTs === 'number' ? Date.now() - triggerTs : undefined ,
		...( data || {} ) ,
	} );
};

export const skipFloatingViewGesture = (
	proc : 'main' | 'renderer' ,
	reason : string ,
	data? : Record<string , unknown> ,
) => {
	const triggerTs = Date.now();
	seq += 1;
	const intervalMs = lastTriggerTs > 0 ? triggerTs - lastTriggerTs : null;
	lastTriggerTs = triggerTs;
	perf.mark( FvPerfPhase.Skipped , proc , `skip-${ seq }-${ triggerTs }` , {
		seq ,
		reason ,
		triggerTs ,
		intervalMs ,
		msFromTrigger : 0 ,
		...( data || {} ) ,
	} );
	perf.flush();
};

export const completeFloatingViewGesture = (
	proc : 'main' | 'renderer' ,
	ctxId : string ,
	data? : Record<string , unknown> ,
) => {
	if( !ctxId || completedCtx.has( ctxId ) ) {
		return;
	}
	completedCtx.add( ctxId );
	noteFloatingViewPerf( proc , ctxId , FvPerfPhase.Complete , data );
	perf.flush();
};

export const resetFloatingViewPerfForTests = () => {
	seq = 0;
	lastTriggerTs = 0;
	rendererBound = null;
	gestureByCtx.clear();
	completedCtx.clear();
};

import { perf } from './switch-perf-recorder.utility';
