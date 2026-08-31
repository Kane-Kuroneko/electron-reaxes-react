/**
 * Settings 侧栏切页性能埋点。只观察，不改切页/目录更新逻辑。
 * 渲染进程 mark → IPC `perf-event` → 主进程写入
 * `performance-logs/settings-menu-perf.jsonl`。
 * 见 docs/features/settings-menu-switch-perf.md
 */

export const SettingsMenuPerfPhase = {
	SelectStart : 'settings-menu:select-start' ,
	DirtyComputed : 'settings-menu:dirty-computed' ,
	AppLayout : 'settings-menu:app-layout' ,
	PanelMount : 'settings-menu:panel-mount' ,
	PanelLayout : 'settings-menu:panel-layout' ,
	PanelPaint : 'settings-menu:panel-paint' ,
	ScrollY : 'settings-menu:scroll-y' ,
	FirstPaint : 'settings-menu:first-paint' ,
	Complete : 'settings-menu:complete' ,
	LongTask : 'settings-menu:longtask' ,
} as const;

type SettingsMenuTrace = {
	ctxId: string;
	selectHrt: number;
	from: string;
	to: string;
	firstVisit: boolean;
	awaitPanel: boolean;
	ended: boolean;
};

let trace:SettingsMenuTrace | null = null;
let flushWired = false;
let longTaskObserver:PerformanceObserver | null = null;

const roundMs = ( value:number ) => Math.round( value * 100 ) / 100;

export const hasActiveSettingsMenuTrace = ():boolean => {
	return Boolean( trace && !trace.ended );
};

export const settingsMenuTraceAwaitingPanel = ():boolean => {
	return Boolean( trace && !trace.ended && trace.awaitPanel );
};

const ensureFlushWired = () => {
	if( flushWired ) {
		return;
	}
	flushWired = true;
	perf.onFlush( events => {
		sendPerfEvent( events );
	} );
};

const startLongTaskObserver = () => {
	stopLongTaskObserver();
	if( typeof PerformanceObserver === 'undefined' ) {
		return;
	}
	try {
		longTaskObserver = new PerformanceObserver( list => {
			if( !hasActiveSettingsMenuTrace() ) {
				return;
			}
			for( const entry of list.getEntries() ) {
				noteSettingsMenu( SettingsMenuPerfPhase.LongTask , {
					name : entry.name ,
					duration : roundMs( entry.duration ) ,
					startTime : roundMs( entry.startTime ),
				} );
			}
		} );
		longTaskObserver.observe( { type : 'longtask' , buffered : true } as PerformanceObserverInit );
	} catch {
		longTaskObserver = null;
	}
};

const stopLongTaskObserver = () => {
	if( longTaskObserver ) {
		longTaskObserver.disconnect();
		longTaskObserver = null;
	}
};

export const beginSettingsMenuTrace = ( input:{
	from: string;
	to: string;
	firstVisit: boolean;
	aiCount: number;
} ):void => {
	ensureFlushWired();
	stopLongTaskObserver();
	const selectHrt = typeof performance !== 'undefined' ? performance.now() : Date.now();
	trace = {
		ctxId : perf.newCtx() ,
		selectHrt ,
		from : input.from ,
		to : input.to ,
		firstVisit : input.firstVisit ,
		awaitPanel : input.firstVisit && input.to === 'mngeai' ,
		ended : false,
	};
	startLongTaskObserver();
	perf.mark( SettingsMenuPerfPhase.SelectStart , 'renderer' , trace.ctxId , {
		from : input.from ,
		to : input.to ,
		firstVisit : input.firstVisit ,
		aiCount : input.aiCount ,
		awaitPanel : trace.awaitPanel ,
		msFromSelect : 0,
	} );
};

export const noteSettingsMenu = (
	phase:string ,
	data?:Record<string , unknown>,
):void => {
	if( !trace || trace.ended ) {
		return;
	}
	const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
	perf.mark( phase , 'renderer' , trace.ctxId , {
		from : trace.from ,
		to : trace.to ,
		firstVisit : trace.firstVisit ,
		msFromSelect : roundMs( now - trace.selectHrt ) ,
		...data,
	} );
};

export const endSettingsMenuTrace = ( data?:Record<string , unknown> ):void => {
	if( !trace || trace.ended ) {
		return;
	}
	noteSettingsMenu( SettingsMenuPerfPhase.Complete , data );
	trace.ended = true;
	stopLongTaskObserver();
	perf.flush();
	trace = null;
};

import { sendPerfEvent } from '#SettingsView/services/Settings';
import { perf } from '#shared/utils/switch-perf-recorder.utility';
