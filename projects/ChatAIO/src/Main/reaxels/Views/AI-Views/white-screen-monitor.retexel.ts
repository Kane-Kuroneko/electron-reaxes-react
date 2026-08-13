/**
 * @description WhiteScreenMonitor Retexel — currentAIView 调度链追踪器
 *
 * 生产与开发一律启用（静态导入进 main bundle）。日志：
 *   userData/logs/white-screen-monitor.jsonl
 *
 * 设计约束（对齐用户要求）：
 * 1. 默认无副作用：不 capturePage / 不 remount / 不踢绘。
 *    capturePage 会踢 compositor 产帧，掩盖真问题。
 * 2. 面向 agent：追踪 view 调度链（focus/show/restore → hierarchy 决策 →
 *    mount/detach/bounds/focus），用 chainId+seq 串起时间线，便于排查根因。
 * 3. 少侵入：业务侧只在调度入口 begin/note/end；不在业务路径散落采帧探针。
 */

import {
	app ,
	type Rectangle ,
	type WebContentsView ,
} from 'electron';
import { isWebContentsViewAlive , isWebContentsViewDead } from '#main/services/web-contents-view-alive.utility';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type ViewScheduleTrigger =
	| 'focus'
	| 'show'
	| 'restore'
	| 'blur'
	| 'hide'
	| 'minimize'
	| 'present-switch'
	| 'present-recover'
	| 'apply-visibility'
	| 'imperative-switch'
	| 'cold-start'
	| 'manual'
	| 'orphan';

export type ViewScheduleOp =
	| 'window-focus'
	| 'window-show'
	| 'window-restore'
	| 'window-blur'
	| 'window-hide'
	| 'window-minimize'
	| 'soft-recover'
	| 'recover-after-focus'
	| 'present'
	| 'mount-switch'
	| 'mount-recover'
	| 'detach'
	| 'set-bounds'
	| 'set-visible'
	| 'restore-focus'
	| 'hierarchy-check'
	| 'apply-visibility'
	| 'instrument-view'
	| 'note';

export type ViewSchedulePhase =
	| 'enter'
	| 'decision'
	| 'action'
	| 'exit'
	| 'bg'
	| 'meta';

export interface ViewHierarchySnapshot {
	viewId: string;
	attached: boolean;
	visible: boolean;
	bounds: Rectangle | null;
	prevBounds?: Rectangle | null;
	mainFocused: boolean;
	mainVisible: boolean;
	mainMinimized: boolean;
	webContentsFocused: boolean;
	isLoading: boolean;
	ready: boolean;
	destroyed: boolean;
	url: string;
	settingsOpened: boolean;
	childrenCount?: number;
}

export interface WhiteScreenMonitorConfig {
	/** 生产/开发一律默认 true；显式关才停 */
	enabled: boolean;
	logDir: string;
	logFileName: string;
	/** 超过该字节则轮转到 .1；0 不轮转 */
	maxLogBytes: number;
	/** 同链最大事件数，防 resize 风暴撑爆 */
	maxEventsPerChain: number;
	/** 无显式 end 时，超过该毫秒自动封链 */
	chainTtlMs: number;
	/** 是否写入 bounds 未变化的 skip（生产默认 false） */
	logBoundsSkipped: boolean;
	/** 是否写入薄堆栈（开发默认 true，生产 false） */
	includeStack: boolean;
}

const DEV_CONFIG: WhiteScreenMonitorConfig = {
	enabled: true ,
	logDir: 'logs' ,
	logFileName: 'white-screen-monitor.jsonl' ,
	maxLogBytes: 20 * 1024 * 1024 ,
	maxEventsPerChain: 80 ,
	chainTtlMs: 8_000 ,
	logBoundsSkipped: true ,
	includeStack: true ,
};

const PROD_CONFIG: WhiteScreenMonitorConfig = {
	...DEV_CONFIG ,
	logBoundsSkipped: false ,
	includeStack: false ,
};

export function resolveWhiteScreenMonitorConfig(
	overrides?: Partial<WhiteScreenMonitorConfig>,
): WhiteScreenMonitorConfig {
	const packaged = (() => {
		try {
			return app.isPackaged;
		} catch {
			return false;
		}
	})();
	const base = packaged ? PROD_CONFIG : DEV_CONFIG;
	return {
		...base ,
		...( overrides || {} ) ,
		enabled: overrides?.enabled ?? true ,
	};
}

export interface ViewScheduleNoteInput {
	op: ViewScheduleOp;
	phase?: ViewSchedulePhase;
	decision?: string;
	trigger?: ViewScheduleTrigger;
	intent?: 'switch' | 'recover';
	viewId?: string;
	snapshot?: Partial<ViewHierarchySnapshot> | null;
	detail?: Record<string , unknown>;
	/** 传入则写入该链；否则挂到当前活动链（没有则开 orphan 链） */
	chainId?: string;
}

interface ActiveChain {
	id: string;
	seq: number;
	startedAt: number;
	trigger: ViewScheduleTrigger;
	rootOp: ViewScheduleOp;
	viewId: string;
}

export class WhiteScreenMonitor {
	private config: WhiteScreenMonitorConfig;
	private logStream: fs.WriteStream | null = null;
	private viewIdByWebContents = new WeakMap<object , string>();
	private activeChain: ActiveChain | null = null;
	private chainSeqGuard = 0;

	constructor(config?: Partial<WhiteScreenMonitorConfig>) {
		this.config = resolveWhiteScreenMonitorConfig( config );
		if( !this.config.enabled ) {
			return;
		}
		this.initLogStream();
	}

	get enabled(): boolean {
		return this.config.enabled;
	}

	/** 当前活动链 id；无则空串。供 setImmediate 等异步步挂回原链。 */
	get activeChainId(): string {
		this.expireActiveChainIfNeeded();
		return this.activeChain?.id || '';
	}

	instrumentView(view: WebContentsView , viewId: string): void {
		if( !this.config.enabled || !isWebContentsViewAlive( view ) ) {
			return;
		}
		this.viewIdByWebContents.set( view.webContents , viewId );
		this.flush( {
			type: 'schedule' ,
			ts: Date.now() ,
			chainId: 'meta' ,
			seq: 0 ,
			op: 'instrument-view' ,
			phase: 'meta' ,
			viewId ,
			decision: 'registered' ,
		} );
	}

	getViewId(view: WebContentsView | null | undefined): string {
		if( !isWebContentsViewAlive( view ) ) {
			return '';
		}
		return this.viewIdByWebContents.get( view.webContents ) || '';
	}

	/**
	 * 开启一条调度链（window focus/show/restore 或 present 入口）。
	 * 同 trigger 短时重入会复用链，避免 focus+show 双开。
	 */
	begin(opts: {
		trigger: ViewScheduleTrigger;
		op: ViewScheduleOp;
		viewId?: string;
		snapshot?: Partial<ViewHierarchySnapshot> | null;
		detail?: Record<string , unknown>;
	}): string {
		if( !this.config.enabled ) {
			return '';
		}
		this.expireActiveChainIfNeeded();
		const now = Date.now();
		if(
			this.activeChain
			&& now - this.activeChain.startedAt < 400
			&& (
				opts.trigger === this.activeChain.trigger
				|| isForegroundPair( this.activeChain.trigger , opts.trigger )
			)
		) {
			this.note( {
				op: opts.op ,
				phase: 'enter' ,
				trigger: opts.trigger ,
				viewId: opts.viewId || this.activeChain.viewId ,
				snapshot: opts.snapshot ,
				detail: {
					...( opts.detail || {} ) ,
					reusedChain: true ,
				} ,
				chainId: this.activeChain.id ,
			} );
			return this.activeChain.id;
		}

		if( this.activeChain ) {
			this.end( { decision: 'auto-close-before-new' , detail: { nextTrigger: opts.trigger } } );
		}

		this.chainSeqGuard += 1;
		const id = `sch-${ now.toString( 36 ) }-${ this.chainSeqGuard.toString( 36 ) }`;
		this.activeChain = {
			id ,
			seq: 0 ,
			startedAt: now ,
			trigger: opts.trigger ,
			rootOp: opts.op ,
			viewId: opts.viewId || '' ,
		};
		this.note( {
			op: opts.op ,
			phase: 'enter' ,
			trigger: opts.trigger ,
			viewId: opts.viewId ,
			snapshot: opts.snapshot ,
			detail: opts.detail ,
			chainId: id ,
		} );
		return id;
	}

	/** 在当前链（或指定 chainId）追加一步 */
	note(input: ViewScheduleNoteInput): void {
		if( !this.config.enabled ) {
			return;
		}
		this.expireActiveChainIfNeeded();

		let chain = this.activeChain;
		if( input.chainId && ( !chain || chain.id !== input.chainId ) ) {
			/* 指定链已结束：仍写入，seq 用独立计数 */
			this.flushSchedule( {
				...input ,
				chainId: input.chainId ,
				seq: -1 ,
			} );
			return;
		}
		if( !chain ) {
			this.begin( {
				trigger: input.trigger || 'orphan' ,
				op: input.op ,
				viewId: input.viewId ,
				snapshot: input.snapshot ,
				detail: input.detail ,
			} );
			return;
		}

		if( input.viewId && !chain.viewId ) {
			chain.viewId = input.viewId;
		}
		chain.seq += 1;
		if( chain.seq > this.config.maxEventsPerChain ) {
			if( chain.seq === this.config.maxEventsPerChain + 1 ) {
				this.flushSchedule( {
					op: 'note' ,
					phase: 'meta' ,
					decision: 'chain-event-cap-reached' ,
					chainId: chain.id ,
					seq: chain.seq ,
					viewId: chain.viewId ,
					detail: { maxEventsPerChain: this.config.maxEventsPerChain } ,
				} );
			}
			return;
		}

		this.flushSchedule( {
			...input ,
			chainId: chain.id ,
			seq: chain.seq ,
			trigger: input.trigger || chain.trigger ,
			viewId: input.viewId || chain.viewId ,
		} );
	}

	end(opts?: {
		decision?: string;
		snapshot?: Partial<ViewHierarchySnapshot> | null;
		detail?: Record<string , unknown>;
	}): void {
		if( !this.config.enabled || !this.activeChain ) {
			return;
		}
		const chain = this.activeChain;
		chain.seq += 1;
		this.flushSchedule( {
			op: chain.rootOp ,
			phase: 'exit' ,
			decision: opts?.decision || 'done' ,
			trigger: chain.trigger ,
			viewId: chain.viewId ,
			snapshot: opts?.snapshot ,
			detail: {
				...( opts?.detail || {} ) ,
				durationMs: Date.now() - chain.startedAt ,
				eventCount: chain.seq ,
			} ,
			chainId: chain.id ,
			seq: chain.seq ,
		} );
		this.activeChain = null;
	}

	/** 后台事件：blur/hide/minimize，独立短链，便于对照「何时丢面」 */
	markBackground(trigger: Extract<ViewScheduleTrigger , 'blur' | 'hide' | 'minimize'> , detail?: Record<string , unknown>): void {
		if( !this.config.enabled ) {
			return;
		}
		if( this.activeChain ) {
			this.end( { decision: 'interrupted-by-background' , detail: { background: trigger } } );
		}
		const chainId = this.begin( {
			trigger ,
			op: trigger === 'blur'
				? 'window-blur'
				: trigger === 'hide'
					? 'window-hide'
					: 'window-minimize' ,
			detail ,
		} );
		this.end( { decision: 'background-marked' , detail: { chainId } } );
	}

	shouldLogBoundsSkipped(): boolean {
		return this.config.logBoundsSkipped;
	}

	captureStack(): string {
		if( !this.config.includeStack ) {
			return '';
		}
		try {
			throw new Error( 'schedule-stack' );
		} catch ( e ) {
			return ( e as Error ).stack?.split( '\n' ).slice( 2 , 8 ).join( '\n' ) || '';
		}
	}

	dispose(): void {
		if( this.activeChain ) {
			this.end( { decision: 'dispose' } );
		}
		if( this.logStream ) {
			try {
				this.logStream.write( JSON.stringify( {
					ts: Date.now() ,
					type: 'session-end' ,
				} ) + '\n' );
				this.logStream.end();
			} catch { /* 静默 */ }
		}
		this.logStream = null;
	}

	private expireActiveChainIfNeeded(): void {
		if( !this.activeChain ) {
			return;
		}
		if( Date.now() - this.activeChain.startedAt <= this.config.chainTtlMs ) {
			return;
		}
		this.end( { decision: 'ttl-expired' } );
	}

	private flushSchedule(input: ViewScheduleNoteInput & { chainId: string; seq: number }): void {
		const record: Record<string , unknown> = {
			type: 'schedule' ,
			ts: Date.now() ,
			chainId: input.chainId ,
			seq: input.seq ,
			op: input.op ,
			phase: input.phase || 'action' ,
			trigger: input.trigger ,
			intent: input.intent ,
			viewId: input.viewId || '' ,
			decision: input.decision ,
			snapshot: input.snapshot || undefined ,
			detail: input.detail || undefined ,
		};
		if( this.config.includeStack && ( input.phase === 'enter' || input.phase === 'decision' ) ) {
			record.stack = this.captureStack();
		}
		this.flush( record );
	}

	private initLogStream(): void {
		try {
			const logDir = path.join( app.getPath( 'userData' ) , this.config.logDir );
			if( !fs.existsSync( logDir ) ) {
				fs.mkdirSync( logDir , { recursive: true } );
			}
			const logPath = path.join( logDir , this.config.logFileName );
			this.rotateLogIfNeeded( logPath );
			this.logStream = fs.createWriteStream( logPath , { flags: 'a' } );
			this.logStream.write( JSON.stringify( {
				ts: Date.now() ,
				type: 'session-start' ,
				mode: 'schedule-trace' ,
				config: {
					...this.config ,
					sideEffect: 'none-observe-only' ,
				} ,
				runtime: {
					isPackaged: app.isPackaged ,
					version: app.getVersion() ,
					platform: process.platform ,
					arch: process.arch ,
					electron: process.versions.electron ,
					chrome: process.versions.chrome ,
				} ,
				agentHint: [
					'Filter type=schedule by chainId; order by seq.' ,
					'Look for decision=hierarchy-broken|hierarchy-ready→focus-only|hierarchy-ready→bounds+focus|mount-*|detach.' ,
					'pair with preceding blur/hide/minimize chains.' ,
					'Expect focus-only on healthy hierarchy (default backgroundThrottling).' ,
					'No capturePage / no surface rebind kick in this mode.' ,
				] ,
			} ) + '\n' );
			console.info(
				`[WhiteScreenMonitor] schedule-trace → ${ logPath }` ,
				`(packaged=${ app.isPackaged })` ,
			);
		} catch ( error ) {
			console.warn( '[WhiteScreenMonitor] Failed to init log stream:' , error );
		}
	}

	private rotateLogIfNeeded(logPath: string): void {
		const maxBytes = this.config.maxLogBytes;
		if( !maxBytes || maxBytes <= 0 || !fs.existsSync( logPath ) ) {
			return;
		}
		try {
			const size = fs.statSync( logPath ).size;
			if( size < maxBytes ) {
				return;
			}
			const rotated = `${ logPath }.1`;
			try {
				if( fs.existsSync( rotated ) ) {
					fs.unlinkSync( rotated );
				}
			} catch { /* 静默 */ }
			fs.renameSync( logPath , rotated );
		} catch ( error ) {
			console.warn( '[WhiteScreenMonitor] Log rotate failed:' , error );
		}
	}

	private flush(record: Record<string , unknown>): void {
		if( !this.logStream ) {
			return;
		}
		try {
			this.logStream.write( JSON.stringify( record ) + '\n' );
		} catch { /* 静默 */ }
	}
}

function isForegroundPair(a: ViewScheduleTrigger , b: ViewScheduleTrigger): boolean {
	const fg = new Set( [ 'focus' , 'show' , 'restore' ] );
	return fg.has( a ) && fg.has( b );
}

/**
 * 只读快照中心 view 层级状态（无副作用）。
 */
export function snapshotCenterViewHierarchy(opts: {
	view: WebContentsView | null | undefined;
	viewId?: string;
	attached: boolean;
	ready?: boolean;
	settingsOpened?: boolean;
	mainFocused?: boolean;
	mainVisible?: boolean;
	mainMinimized?: boolean;
	childrenCount?: number;
}): ViewHierarchySnapshot {
	const view = opts.view;
	const destroyed = isWebContentsViewDead( view );
	let bounds: Rectangle | null = null;
	let visible = false;
	let url = '';
	let webContentsFocused = false;
	let isLoading = false;
	if( !destroyed && view ) {
		try { bounds = view.getBounds(); } catch { bounds = null; }
		try { visible = view.getVisible(); } catch { visible = false; }
		try { url = view.webContents.getURL(); } catch { url = ''; }
		try { webContentsFocused = view.webContents.isFocused(); } catch { webContentsFocused = false; }
		try { isLoading = view.webContents.isLoading(); } catch { isLoading = false; }
	}
	return {
		viewId: opts.viewId || '' ,
		attached: opts.attached ,
		visible ,
		bounds ,
		mainFocused: Boolean( opts.mainFocused ) ,
		mainVisible: Boolean( opts.mainVisible ) ,
		mainMinimized: Boolean( opts.mainMinimized ) ,
		webContentsFocused ,
		isLoading ,
		ready: Boolean( opts.ready ) ,
		destroyed ,
		url ,
		settingsOpened: Boolean( opts.settingsOpened ) ,
		childrenCount: opts.childrenCount ,
	};
}

let globalWhiteScreenMonitor: WhiteScreenMonitor | null = null;

export function getWhiteScreenMonitor(
	config?: Partial<WhiteScreenMonitorConfig>,
): WhiteScreenMonitor {
	if( !globalWhiteScreenMonitor || config ) {
		if( globalWhiteScreenMonitor ) {
			globalWhiteScreenMonitor.dispose();
		}
		globalWhiteScreenMonitor = new WhiteScreenMonitor( config );
	}
	return globalWhiteScreenMonitor;
}

/** @deprecated 旧探针 API 已移除；保留别名避免外部残留引用编译失败 */
export type WhiteScreenProbeTrigger = ViewScheduleTrigger;
export type WhiteScreenHierarchySnapshot = ViewHierarchySnapshot;
