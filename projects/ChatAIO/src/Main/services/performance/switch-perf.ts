/**
 * 主进程性能日志落盘服务
 *
 * 接收来自渲染进程（通过 IPC）和主进程自身的 PerfEvent。
 *  - performance-logs/perf-<timestamp>.jsonl
 *  - Settings 侧栏切页另写 settings-menu-perf.jsonl
 *  - 轮播契约另写 carousel-ops.jsonl
 *  - FloatingView 轨迹/性能另写 userData/logs/floating-view-perf.jsonl
 *    （正式包排查入口，见 docs/features/floating-view-perf-monitor.md）
 */

const PERF_LOG_DIR_NAME = 'performance-logs';
const SETTINGS_MENU_LOG_NAME = 'settings-menu-perf.jsonl';
const CAROUSEL_OP_LOG_NAME = 'carousel-ops.jsonl';
const FV_PERF_LOG_NAME = 'floating-view-perf.jsonl';
const FLUSH_INTERVAL_MS = 5000;
const FV_PERF_MAX_BYTES = 20 * 1024 * 1024;
const FV_PERF_CTX_TTL_MS = 30_000;

let logStream: fs.WriteStream | null = null;
let logPath: string | null = null;
let settingsMenuLogStream: fs.WriteStream | null = null;
let settingsMenuLogPath: string | null = null;
let carouselOpLogStream: fs.WriteStream | null = null;
let carouselOpLogPath: string | null = null;
let fvPerfLogStream: fs.WriteStream | null = null;
let fvPerfLogPath: string | null = null;
let fvPerfWrites = 0;
let flushTimer: ReturnType<typeof setInterval> | null = null;
const fvPerfCtxExpiry = new Map<string , number>();

/** 初始化性能日志系统：创建日志文件并注册 flush 处理器 */
export function initSwitchPerformanceLogging(): void {
	const projectRoot = getProjectRoot();
	const logDir = path.join( projectRoot , PERF_LOG_DIR_NAME );

	if( !fs.existsSync( logDir ) ) {
		fs.mkdirSync( logDir , { recursive : true } );
	}

	const timestamp = new Date().toISOString().replace( /:/g , '-' ).replace( /\..+/ , '' );
	logPath = path.join( logDir , `perf-${ timestamp }.jsonl` );
	logStream = fs.createWriteStream( logPath , { flags : 'a' } );
	settingsMenuLogPath = path.join( logDir , SETTINGS_MENU_LOG_NAME );
	settingsMenuLogStream = fs.createWriteStream( settingsMenuLogPath , { flags : 'a' } );
	carouselOpLogPath = path.join( logDir , CAROUSEL_OP_LOG_NAME );
	carouselOpLogStream = fs.createWriteStream( carouselOpLogPath , { flags : 'a' } );
	openFvPerfLogStream();

	console.log( `[SwitchPerf] Logging to: ${ logPath }` );
	console.log( `[SwitchPerf] Settings menu log: ${ settingsMenuLogPath }` );
	console.log( `[SwitchPerf] Carousel ops log: ${ carouselOpLogPath }` );
	console.log( `[SwitchPerf] FloatingView perf log: ${ fvPerfLogPath }` );

	/* 主进程自身事件的 flush：直接写文件 */
	perf.onFlush( ( events ) => {
		writeEvents( events );
	} );

	/* 接收渲染进程发来的性能事件 */
	useIpcRendererToMain( 'perf-event' ).on( ( _ , events ) => {
		writeEvents( events );
	} );

	/* 定期 flush 未满缓冲区的残留事件 */
	flushTimer = setInterval( () => {
		const pending = perf.drain();
		if( pending.length > 0 ) {
			writeEvents( pending );
		}
		expireFvPerfCtx();
	} , FLUSH_INTERVAL_MS );

	/* 退出前 flush 全部 */
	app.on( 'before-quit' , () => {
		shutdownPerformanceLogging();
	} );
}

/** 外部调用：写入渲染进程发来的性能事件 */
export function writePerfEvents( events: PerfEvent[] ): void {
	writeEvents( events );
}

/** 关闭日志流 */
export function shutdownPerformanceLogging(): void {
	if( flushTimer ) {
		clearInterval( flushTimer );
		flushTimer = null;
	}
	const pending = perf.drain();
	if( pending.length > 0 ) {
		writeEvents( pending );
	}
	if( logStream ) {
		logStream.end();
		logStream = null;
		console.log( `[SwitchPerf] Log closed: ${ logPath }` );
	}
	if( settingsMenuLogStream ) {
		settingsMenuLogStream.end();
		settingsMenuLogStream = null;
		console.log( `[SwitchPerf] Settings menu log closed: ${ settingsMenuLogPath }` );
	}
	if( carouselOpLogStream ) {
		carouselOpLogStream.end();
		carouselOpLogStream = null;
		console.log( `[SwitchPerf] Carousel ops log closed: ${ carouselOpLogPath }` );
	}
	if( fvPerfLogStream ) {
		fvPerfLogStream.end();
		fvPerfLogStream = null;
		console.log( `[SwitchPerf] FloatingView perf log closed: ${ fvPerfLogPath }` );
	}
}

function writeEvents( events: PerfEvent[] ): void {
	if( !logStream ) return;
	for( const event of events ) {
		const line = JSON.stringify( event ) + '\n';
		logStream.write( line );
		if( settingsMenuLogStream && typeof event.phase === 'string' && event.phase.startsWith( 'settings-menu:' ) ) {
			settingsMenuLogStream.write( line );
		}
		if( carouselOpLogStream && event.phase === CAROUSEL_OP_PHASE ) {
			carouselOpLogStream.write( line );
		}
		if( shouldWriteFvPerf( event ) ) {
			writeFvPerfLine( line );
		}
	}
}

function rememberFvPerfCtx( ctxId: string ): void {
	if( !ctxId ) {
		return;
	}
	fvPerfCtxExpiry.set( ctxId , Date.now() + FV_PERF_CTX_TTL_MS );
}

function expireFvPerfCtx(): void {
	const now = Date.now();
	for( const [ ctxId , expiry ] of fvPerfCtxExpiry ) {
		if( expiry <= now ) {
			fvPerfCtxExpiry.delete( ctxId );
		}
	}
}

function shouldWriteFvPerf( event: PerfEvent ): boolean {
	if( typeof event.phase !== 'string' ) {
		return false;
	}
	if( isFvPerfPhase( event.phase ) ) {
		if( event.phase === FvPerfPhase.Trigger || event.phase === FvPerfPhase.Skipped ) {
			rememberFvPerfCtx( event.ctxId );
		}
		return true;
	}
	if( event.phase === CAROUSEL_OP_PHASE ) {
		return false;
	}
	if( event.ctxId && fvPerfCtxExpiry.has( event.ctxId ) ) {
		rememberFvPerfCtx( event.ctxId );
		return event.phase.startsWith( 'switch:' ) || event.phase.startsWith( 'fv:' );
	}
	return false;
}

function writeFvPerfLine( line: string ): void {
	if( !fvPerfLogStream ) {
		openFvPerfLogStream();
	}
	if( !fvPerfLogStream ) {
		return;
	}
	fvPerfLogStream.write( line );
	fvPerfWrites += 1;
	if( fvPerfWrites % 200 === 0 ) {
		rotateFvPerfLogIfNeeded( true );
	}
}

function fvPerfLogsDir(): string {
	return path.join( app.getPath( 'userData' ) , 'logs' );
}

function openFvPerfLogStream(): void {
	try {
		const logDir = fvPerfLogsDir();
		if( !fs.existsSync( logDir ) ) {
			fs.mkdirSync( logDir , { recursive : true } );
		}
		fvPerfLogPath = path.join( logDir , FV_PERF_LOG_NAME );
		rotateFvPerfLogIfNeeded( false );
		fvPerfLogStream = fs.createWriteStream( fvPerfLogPath , { flags : 'a' } );
		fvPerfLogStream.write( JSON.stringify( {
			ts : Date.now() ,
			proc : 'main' ,
			phase : 'fv-perf:session-start' ,
			ctxId : 'session' ,
			data : {
				isPackaged : app.isPackaged ,
				version : app.getVersion() ,
				platform : process.platform ,
				arch : process.arch ,
				electron : process.versions.electron ,
				chrome : process.versions.chrome ,
				logPath : fvPerfLogPath ,
				observeOnly : true ,
			} ,
		} ) + '\n' );
	} catch ( error ) {
		console.warn( '[SwitchPerf] Failed to open FloatingView perf log:' , error );
		fvPerfLogStream = null;
		fvPerfLogPath = null;
	}
}

function rotateFvPerfLogIfNeeded( reopen: boolean ): void {
	if( !fvPerfLogPath || !fs.existsSync( fvPerfLogPath ) ) {
		return;
	}
	try {
		const size = fs.statSync( fvPerfLogPath ).size;
		if( size < FV_PERF_MAX_BYTES ) {
			return;
		}
		if( fvPerfLogStream ) {
			fvPerfLogStream.end();
			fvPerfLogStream = null;
		}
		const rotated = `${ fvPerfLogPath }.1`;
		if( fs.existsSync( rotated ) ) {
			fs.unlinkSync( rotated );
		}
		fs.renameSync( fvPerfLogPath , rotated );
		if( reopen ) {
			openFvPerfLogStream();
		}
	} catch ( error ) {
		console.warn( '[SwitchPerf] FloatingView perf log rotate failed:' , error );
	}
}

/** 定位 ChatAIO 子工程根目录（兼容 dev 和 packaged 两种运行模式） */
function getProjectRoot(): string {
	/* packaged 模式: 日志写入 userData 目录，不在 resources/app.asar 中写 */
	const appPath = app.getAppPath();
	if( app.isPackaged || appPath.endsWith( 'app.asar' ) ) {
		return app.getPath( 'userData' );
	}
	/* dev 模式: 项目根即 ChatAIO */
	return appPath;
}

import { CAROUSEL_OP_PHASE } from '#shared/carousel-op.utility';
import {
	FvPerfPhase ,
	isFvPerfPhase ,
} from '#shared/utils/floating-view-perf.utility';
import { perf } from '#shared/utils/switch-perf-recorder.utility';
import type { PerfEvent } from '#shared/utils/switch-perf-recorder.utility';
import { useIpcRendererToMain } from '#main/services/ipc';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
