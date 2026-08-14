/**
 * @description 预加载 AI 首次切换探针
 *
 * v8：未首展 load 中 attach+全尺寸盖下可见；load 完仍 attach+全尺寸但 hidden，避免多层合成卡切换。
 * 只写 userData/logs/preload-flash-probe.jsonl，不打控制台，热路径禁止 capturePage。
 *
 * Agent 读：warmup（did-finish-load / did-stop-loading）→ first-switch-pre → verdict。
 */

import {
	app ,
	type Rectangle ,
	type WebContentsView ,
} from 'electron';
import {
	getAliveWebContents ,
	isWebContentsViewDead ,
} from '#main/services/web-contents-view-alive.utility';
import { getWhiteScreenMonitor } from './white-screen-monitor.retexel';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type PreloadWarmupState = {
	viewId: string;
	createdAt: number;
	didFinishLoadAt: number | null;
	didStopLoadingAt: number | null;
	didFailLoadAt: number | null;
	firstSwitchAt: number | null;
	firstSwitchProbed: boolean;
};

export type PreloadFlashVerdict =
	| 'hydrated-then-frozen'
	| 'under-cover-warmed'
	| 'still-hidden-on-switch'
	| 'tiny-bounds-on-switch'
	| 'still-loading-on-switch'
	| 'detached-before-switch'
	| 'inconclusive';

type FirstSwitchProbeContext = {
	viewId: string;
	chainId: string;
	startedAt: number;
	pre: {
		attached: boolean;
		visible: boolean;
		bounds: Rectangle | null;
		ready: boolean;
		isLoading: boolean;
		hasPresented: boolean;
		url: string;
		loadAgeMs: number | null;
	};
};

export class PreloadFlashProbe {
	private warmupByViewId = new Map<string , PreloadWarmupState>();
	private viewRefById = new Map<string , WeakRef<WebContentsView>>();
	private activeFirstSwitch: FirstSwitchProbeContext | null = null;
	private logStream: fs.WriteStream | null = null;
	private enabled = true;

	constructor() {
		this.initLogStream();
	}

	get isEnabled(): boolean {
		return this.enabled;
	}

	instrumentView(view: WebContentsView , viewId: string): void {
		if( !this.enabled || isWebContentsViewDead( view ) ) {
			return;
		}
		const existing = this.warmupByViewId.get( viewId );
		if( existing ) {
			this.viewRefById.set( viewId , new WeakRef( view ) );
			return;
		}
		const state: PreloadWarmupState = {
			viewId ,
			createdAt: Date.now() ,
			didFinishLoadAt: null ,
			didStopLoadingAt: null ,
			didFailLoadAt: null ,
			firstSwitchAt: null ,
			firstSwitchProbed: false ,
		};
		this.warmupByViewId.set( viewId , state );
		this.viewRefById.set( viewId , new WeakRef( view ) );

		const webContents = getAliveWebContents( view );
		if( !webContents ) {
			return;
		}
		webContents.on( 'did-finish-load' , () => {
			state.didFinishLoadAt = Date.now();
			this.emit( {
				type: 'preload-flash' ,
				phase: 'warmup' ,
				decision: 'did-finish-load' ,
				viewId ,
				detail: {
					...this.warmupDetail( state ) ,
					afterFirstSwitchMs: state.firstSwitchAt
						? state.didFinishLoadAt - state.firstSwitchAt
						: null ,
				} ,
			} );
		} );
		webContents.on( 'did-stop-loading' , () => {
			state.didStopLoadingAt = Date.now();
			this.emit( {
				type: 'preload-flash' ,
				phase: 'warmup' ,
				decision: 'did-stop-loading' ,
				viewId ,
				detail: {
					...this.warmupDetail( state ) ,
					afterFirstSwitchMs: state.firstSwitchAt
						? state.didStopLoadingAt - state.firstSwitchAt
						: null ,
				} ,
			} );
		} );
		webContents.on( 'did-fail-load' , () => {
			state.didFailLoadAt = Date.now();
			this.emit( {
				type: 'preload-flash' ,
				phase: 'warmup' ,
				decision: 'did-fail-load' ,
				viewId ,
				detail: this.warmupDetail( state ),
			} );
		} );

		this.emit( {
			type: 'preload-flash' ,
			phase: 'warmup' ,
			decision: 'instrumented' ,
			viewId ,
			detail: this.warmupDetail( state ),
		} );
	}

	/** 首次切到尚未 hasPresented 的 AI（在 mount 之前）。只记 pre 快照。 */
	beginFirstSwitch(opts: {
		view: WebContentsView;
		viewId: string;
		ready: boolean;
		hasPresented: boolean;
		attached: boolean;
	}): void {
		if( !this.enabled || opts.hasPresented ) {
			return;
		}
		const state = this.ensureState( opts.viewId );
		if( state.firstSwitchProbed ) {
			return;
		}
		state.firstSwitchProbed = true;
		state.firstSwitchAt = Date.now();
		this.viewRefById.set( opts.viewId , new WeakRef( opts.view ) );

		const bounds = safeGetBounds( opts.view );
		const visible = safeGetVisible( opts.view );
		const webContents = getAliveWebContents( opts.view );
		const isLoading = Boolean( webContents?.isLoading() );
		const url = safeGetURL( opts.view );
		const mon = getWhiteScreenMonitor();
		const chainId = mon.activeChainId || `preload-${ Date.now().toString( 36 ) }`;

		const ctx: FirstSwitchProbeContext = {
			viewId: opts.viewId ,
			chainId ,
			startedAt: state.firstSwitchAt ,
			pre: {
				attached: opts.attached ,
				visible ,
				bounds ,
				ready: opts.ready ,
				isLoading ,
				hasPresented: opts.hasPresented ,
				url ,
				loadAgeMs: state.didStopLoadingAt
					? state.firstSwitchAt - state.didStopLoadingAt
					: state.didFinishLoadAt
						? state.firstSwitchAt - state.didFinishLoadAt
						: null ,
			} ,
		};
		this.activeFirstSwitch = ctx;

		this.emit( {
			type: 'preload-flash' ,
			phase: 'first-switch-pre' ,
			decision: 'armed' ,
			viewId: opts.viewId ,
			chainId ,
			detail: {
				pre: ctx.pre ,
				warmup: this.warmupDetail( state ),
			},
		} );
	}

	/** mount 之后立刻根据 pre 快照出 verdict，不做 capturePage。 */
	finalizeFirstSwitch(opts: { viewId: string }): void {
		if( !this.enabled ) {
			return;
		}
		const ctx = this.activeFirstSwitch;
		if( !ctx || ctx.viewId !== opts.viewId ) {
			return;
		}
		const verdict = classifyPreloadFlash( ctx );
		const state = this.warmupByViewId.get( ctx.viewId );
		this.emit( {
			type: 'preload-flash' ,
			phase: 'verdict' ,
			decision: verdict ,
			viewId: ctx.viewId ,
			chainId: ctx.chainId ,
			detail: {
				pre: ctx.pre ,
				warmup: state ? this.warmupDetail( state ) : null ,
				agentHint: verdictAgentHint( verdict ),
				durationMs: Date.now() - ctx.startedAt ,
			},
		} );
		if( this.activeFirstSwitch === ctx ) {
			this.activeFirstSwitch = null;
		}
	}

	logEvent(record: Record<string , unknown>): void {
		this.emit( record );
	}

	private ensureState(viewId: string): PreloadWarmupState {
		let state = this.warmupByViewId.get( viewId );
		if( !state ) {
			state = {
				viewId ,
				createdAt: Date.now() ,
				didFinishLoadAt: null ,
				didStopLoadingAt: null ,
				didFailLoadAt: null ,
				firstSwitchAt: null ,
				firstSwitchProbed: false ,
			};
			this.warmupByViewId.set( viewId , state );
		}
		return state;
	}

	private warmupDetail(state: PreloadWarmupState) {
		return {
			createdAt: state.createdAt ,
			didFinishLoadAt: state.didFinishLoadAt ,
			didStopLoadingAt: state.didStopLoadingAt ,
			didFailLoadAt: state.didFailLoadAt ,
			firstSwitchAt: state.firstSwitchAt ,
			ageMs: Date.now() - state.createdAt ,
		};
	}

	private initLogStream(): void {
		try {
			const logDir = path.join( app.getPath( 'userData' ) , 'logs' );
			if( !fs.existsSync( logDir ) ) {
				fs.mkdirSync( logDir , { recursive: true } );
			}
			const logPath = path.join( logDir , 'preload-flash-probe.jsonl' );
			this.logStream = fs.createWriteStream( logPath , { flags: 'a' } );
			this.logStream.write( JSON.stringify( {
				ts: Date.now() ,
				type: 'session-start' ,
				mode: 'preload-flash-probe' ,
				logPath ,
				sideEffect: 'none-observe-only' ,
				agentHint: [
					'Filter type=preload-flash; follow viewId: warmup → first-switch-pre → verdict.' ,
					'Do not print to console; agent reads this jsonl from userData/logs.' ,
					'v8 expected first-switch-pre after hydrate: attached=true visible=false full bounds loading=false (hydrated-then-frozen).' ,
					'If switched during load / 400ms paint window: attached=true visible=true → under-cover-warmed.' ,
					'Verdict meanings: see docs/issues/ai-view-preload-first-switch-flash.md §Probe.' ,
				] ,
				runtime: {
					isPackaged: app.isPackaged ,
					platform: process.platform ,
					electron: process.versions.electron ,
				} ,
			} ) + '\n' );
		} catch {
			this.enabled = false;
		}
	}

	private emit(record: Record<string , unknown>): void {
		if( !this.logStream ) {
			return;
		}
		try {
			this.logStream.write( JSON.stringify( {
				ts: Date.now() ,
				...record ,
			} ) + '\n' );
		} catch { /* 静默 */ }
		try {
			const mon = getWhiteScreenMonitor();
			if( mon.enabled && mon.activeChainId ) {
				mon.note( {
					op: 'note' ,
					phase: 'meta' ,
					decision: `preload-flash:${ String( record.decision || record.phase ) }` ,
					viewId: typeof record.viewId === 'string' ? record.viewId : undefined ,
					detail: {
						preloadFlash: true ,
						phase: record.phase ,
						decision: record.decision ,
					} ,
				} );
			}
		} catch { /* 静默 */ }
	}
}

const MIN_WARM_BOUNDS = 32;

function isTinyPreloadBounds(bounds: Rectangle | null): boolean {
	if( !bounds ) {
		return true;
	}
	return bounds.width < MIN_WARM_BOUNDS || bounds.height < MIN_WARM_BOUNDS;
}

function classifyPreloadFlash(ctx: FirstSwitchProbeContext): PreloadFlashVerdict {
	const { pre } = ctx;
	if( pre.isLoading ) {
		return 'still-loading-on-switch';
	}
	if( !pre.attached ) {
		return 'detached-before-switch';
	}
	if( isTinyPreloadBounds( pre.bounds ) ) {
		return 'tiny-bounds-on-switch';
	}
	if( !pre.visible ) {
		if( pre.loadAgeMs !== null ) {
			return 'hydrated-then-frozen';
		}
		return 'still-hidden-on-switch';
	}
	return 'under-cover-warmed';
}

function verdictAgentHint(verdict: PreloadFlashVerdict): string {
	switch( verdict ) {
		case 'hydrated-then-frozen':
			return 'v8 预期：hydrate 后 hidden，仍 attach+全尺寸；首切只唤醒一层 GPU。';
		case 'under-cover-warmed':
			return '仍在 load / 400ms 画窗内盖下可见。等 load 完再切应变成 hydrated-then-frozen。';
		case 'still-hidden-on-switch':
			return '从未 load 完就 hidden：盖未就绪或 park 没露出过，切过去 SPA 可能醒。';
		case 'tiny-bounds-on-switch':
			return '回归 1×1 hold：首切会从 1px 撑开，看起来像重新 load。';
		case 'still-loading-on-switch':
			return '首切时仍在 loading：用户切太早，或后台导航仍被饿死。';
		case 'detached-before-switch':
			return '回归：未首展页在首切前被 detach，load 会被饿死。';
		default:
			return '证据不足：读 userData/logs/preload-flash-probe.jsonl。';
	}
}

function safeGetBounds(view: WebContentsView): Rectangle | null {
	try {
		return view.getBounds();
	} catch {
		return null;
	}
}

function safeGetVisible(view: WebContentsView): boolean {
	try {
		return view.getVisible();
	} catch {
		return false;
	}
}

function safeGetURL(view: WebContentsView): string {
	try {
		return view.webContents.getURL();
	} catch {
		return '';
	}
}

let globalPreloadFlashProbe: PreloadFlashProbe | null = null;

export function getPreloadFlashProbe(): PreloadFlashProbe {
	if( !globalPreloadFlashProbe ) {
		globalPreloadFlashProbe = new PreloadFlashProbe();
	}
	return globalPreloadFlashProbe;
}
