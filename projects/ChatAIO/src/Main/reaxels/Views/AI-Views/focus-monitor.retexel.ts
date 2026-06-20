/**
 * @description FocusMonitor Retexel — AI 视图焦点窃取运行时检测器
 *
 * Retexel（Reaxes Test Module）：可实例化的测试模块，注入 reaxel 中使用。
 *
 * 功能：
 * 1. 监听 AI 页面 preload 推送的 `focus-state-change` IPC 事件
 * 2. 维护 WebContents → FocusState 的缓存映射
 * 3. 包装 `webContents.focus()` 调用，在调用前后采样焦点状态
 * 4. 检测并记录"焦点被窃取"事件到 JSONL 日志
 *
 * 使用方式（在 reaxel_AIViews 中注入）：
 *   const focusMonitor = FocusMonitor({ enabled: dev() });
 *   focusMonitor.instrumentView(view, aiId);
 *   focusMonitor.wrapFocus(view, aiId, 'explicit', () => view.webContents.focus());
 */

import {
	useIpcRendererToMain,
} from '#main/services/ipc';
import {
	app ,
	type WebContents ,
	type WebContentsView,
} from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * FocusState 由 ai-page-preload.ts 推送，仅包含必要字段
 */
interface FocusState {
	hasFocusedElement: boolean;
	lastFocusChange: number;
	reportedAt: number;
}

/**
 * 焦点调用事件记录
 */
interface FocusCallRecord {
	ts: number;
	source: string;
	currentViewId: string;
	callingViewId: string | null;
	isCrossView: boolean;
	hadActiveInputBefore: boolean;
	hadActiveInputAfter: boolean;
	wasFocusStolen: boolean;
	stack: string;
	message: string;
}

export type FocusCallSource =
	| 'did-stop-loading'
	| 'did-fail-load'
	| 'apply-visibility'
	| 'focus-current-content-view'
	| 'prompt-view-close'
	| 'explicit'
	| 'unknown';

export interface FocusMonitorConfig {
	/** 是否启用焦点监控（生产环境建议关闭） */
	enabled: boolean;
	/** 是否在每次 focus() 调用前后采样焦点状态 */
	pollOnBeforeAfter: boolean;
	/** 是否记录堆栈跟踪 */
	stackTraceOnCall: boolean;
	/** 日志目录（相对于 app.getPath('userData')） */
	logDir: string;
}

const DEFAULT_CONFIG: FocusMonitorConfig = {
	enabled: true,
	pollOnBeforeAfter: true,
	stackTraceOnCall: true,
	logDir: 'logs',
};

/**
 * 获取堆栈跟踪字符串
 */
function captureStack(): string {
	try {
		throw new Error( 'stack trace' );
	} catch ( e ) {
		return ( e as Error ).stack?.split( '\n' ).slice( 2, 8 ).join( '\n' ) || '';
	}
}

export class FocusMonitor {

	private config: FocusMonitorConfig;
	private logStream: fs.WriteStream | null = null;

	/**
	 * WebContents → 最后已知焦点状态
	 * preload 通过 IPC 推送，Key 为 WebContents 对象引用
	 */
	private focusStateByWebContents = new WeakMap<WebContents, FocusState>();

	/**
	 * WebContents → AI view ID 映射（由 instrumentView 注册）
	 */
	private viewIdByWebContents = new WeakMap<WebContents, string>();

	private recordBuffer: FocusCallRecord[] = [];

	constructor(config?: Partial<FocusMonitorConfig>) {
		this.config = { ...DEFAULT_CONFIG , ...config };

		if( !this.config.enabled ) {
			return;
		}

		this.setupIpcListeners();
		this.initLogStream();
	}

	/**
	 * 设置 IPC 监听：AI view preload 推送焦点状态变化
	 */
	private setupIpcListeners(): void {
		useIpcRendererToMain( 'focus-state-change' ).on( ( { event } , state ) => {
			if( !state || typeof state.hasFocusedElement !== 'boolean' ) {
				return;
			}
			this.focusStateByWebContents.set( event.sender , {
				hasFocusedElement: state.hasFocusedElement,
				lastFocusChange: state.lastFocusChange ?? Date.now(),
				reportedAt: state.reportedAt ?? Date.now(),
			} );
		} );
	}

	/**
	 * 初始化日志流
	 */
	private initLogStream(): void {
		try {
			const logDir = path.join( app.getPath( 'userData' ), this.config.logDir );
			if( !fs.existsSync( logDir ) ) {
				fs.mkdirSync( logDir , { recursive : true } );
			}
			const timestamp = new Date().toISOString().replace( /[:.]/g, '-' );
			const logPath = path.join( logDir, `focus-monitor-${ timestamp }.jsonl` );
			this.logStream = fs.createWriteStream( logPath , { flags : 'a' } );
			this.logStream.write( JSON.stringify( {
				ts: Date.now(),
				type: 'session-start',
				config: this.config,
			} ) + '\n' );
			console.info( `[FocusMonitor] Logging to ${ logPath }` );
		} catch ( error ) {
			console.warn( '[FocusMonitor] Failed to init log stream:' , error );
		}
	}

	/**
	 * 注册一个 AI view 到监控器
	 */
	instrumentView( view: WebContentsView, viewId: string ): void {
		if( !this.config.enabled ) return;
		this.viewIdByWebContents.set( view.webContents, viewId );
	}

	/**
	 * 获取指定 WebContents 的焦点状态
	 */
	getFocusState( webContents: WebContents ): FocusState | undefined {
		return this.focusStateByWebContents.get( webContents );
	}

	/**
	 * 获取指定 view 的 ID
	 */
	getViewId( webContents: WebContents ): string | undefined {
		return this.viewIdByWebContents.get( webContents );
	}

	/**
	 * 在当前视图上执行 focus()，并在前后采样焦点状态
	 * 检测到的焦点窃取事件通过日志记录
	 */
	wrapFocus(
		view: WebContentsView,
		viewId: string,
		source: FocusCallSource,
		fn: () => void,
	): void {
		if( !this.config.enabled ) {
			fn();
			return;
		}

		const beforeState = this.focusStateByWebContents.get( view.webContents );
		const hadInputBefore = beforeState?.hasFocusedElement ?? false;

		// 执行原始 focus()
		fn();

		// 在下一个 microtask 中采样 after 状态，给渲染进程响应时间
		setTimeout( () => {
			const afterState = this.focusStateByWebContents.get( view.webContents );
			const hadInputAfter = afterState?.hasFocusedElement ?? false;

			const detectedSteal = hadInputBefore && !hadInputAfter;

			const record: FocusCallRecord = {
				ts: Date.now(),
				source,
				currentViewId: viewId,
				callingViewId: viewId,
				isCrossView: false,
				hadActiveInputBefore: hadInputBefore,
				hadActiveInputAfter: hadInputAfter,
				wasFocusStolen: detectedSteal,
				stack: this.config.stackTraceOnCall ? captureStack() : '',
				message: detectedSteal
					? `[STEAL] focus() on ${ viewId } (${ source }) — active input LOST`
					: hadInputBefore
						? `[OK] focus() on ${ viewId } (${ source }) — active input preserved`
						: `[INFO] focus() on ${ viewId } (${ source }) — no active input`,
			};

			this.recordBuffer.push( record );
			this.flushRecord( record );
		} , 0 );
	}

	/**
	 * 记录并写入日志
	 */
	private flushRecord( record: FocusCallRecord ): void {
		if( this.logStream ) {
			try {
				this.logStream.write( JSON.stringify( {
					...record ,
					type: 'focus-call',
				} ) + '\n' );
			} catch { /* 写入失败静默处理 */ }
		}
	}

	/**
	 * 添加显式日志消息
	 */
	log( message: string, data?: Record<string, unknown> ): void {
		if( this.logStream ) {
			try {
				this.logStream.write( JSON.stringify( {
					ts: Date.now(),
					type: 'info',
					message,
					...( data || {} ),
				} ) + '\n' );
			} catch { /* 静默 */ }
		}
	}

	/**
	 * 获取缓存的记录用于分析
	 */
	drainRecords(): FocusCallRecord[] {
		const records = this.recordBuffer.slice();
		this.recordBuffer = [];
		return records;
	}

	/**
	 * 关闭日志流
	 */
	dispose(): void {
		if( this.logStream ) {
			try {
				this.logStream.write( JSON.stringify( {
					ts: Date.now(),
					type: 'session-end',
					recordCount: this.recordBuffer.length,
				} ) + '\n' );
				this.logStream.end();
			} catch { /* 静默 */ }
		}
		this.logStream = null;
	}

	get enabled(): boolean {
		return this.config.enabled;
	}
}

/**
 * 全局 FocusMonitor 实例（由 reaxel_AIViews 在初始化时注入）
 */
let globalFocusMonitor: FocusMonitor | null = null;

/**
 * 获取或创建全局 FocusMonitor
 */
export function getFocusMonitor( config?: Partial<FocusMonitorConfig> ): FocusMonitor {
	if( !globalFocusMonitor || config ) {
		if( globalFocusMonitor ) {
			globalFocusMonitor.dispose();
		}
		globalFocusMonitor = new FocusMonitor( config || DEFAULT_CONFIG );
	}
	return globalFocusMonitor;
}

/**
 * 包装 webContents.focus() 调用
 * 由 focus 调用点（focusAIViewIfReady / focusCurrentContentView 等）使用
 */
export function wrapWebContentsFocus(
	view: WebContentsView,
	viewId: string,
	source: FocusCallSource,
): void {
	const monitor = globalFocusMonitor;
	if( !monitor || !monitor.enabled ) {
		view.webContents.focus();
		return;
	}
	monitor.wrapFocus( view, viewId, source, () => {
		view.webContents.focus();
	} );
}
