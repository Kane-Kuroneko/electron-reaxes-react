/**
 * 主进程性能日志落盘服务
 *
 * 接收来自渲染进程（通过 IPC）和主进程自身的 PerfEvent，写入
 * projects/ChatAIO/performance-logs/perf-<timestamp>.jsonl
 * Settings 侧栏切页另写 settings-menu-perf.jsonl（见 docs/features/settings-menu-switch-perf.md）
 */

import { perf } from '#shared/utils/switch-perf-recorder.utility';
import type { PerfEvent } from '#shared/utils/switch-perf-recorder.utility';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';

const PERF_LOG_DIR_NAME = 'performance-logs';
const SETTINGS_MENU_LOG_NAME = 'settings-menu-perf.jsonl';
const FLUSH_INTERVAL_MS = 5000;

let logStream: fs.WriteStream | null = null;
let logPath: string | null = null;
let settingsMenuLogStream: fs.WriteStream | null = null;
let settingsMenuLogPath: string | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

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

	console.log( `[SwitchPerf] Logging to: ${ logPath }` );
	console.log( `[SwitchPerf] Settings menu log: ${ settingsMenuLogPath }` );

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
}

function writeEvents( events: PerfEvent[] ): void {
	if( !logStream ) return;
	for( const event of events ) {
		const line = JSON.stringify( event ) + '\n';
		logStream.write( line );
		if( settingsMenuLogStream && typeof event.phase === 'string' && event.phase.startsWith( 'settings-menu:' ) ) {
			settingsMenuLogStream.write( line );
		}
	}
}

/** 定位 ChatAIO 子工程根目录（兼容 dev 和 packaged 两种运行模式） */
function getProjectRoot(): string {
	/* packaged 模式: 日志写入 userData 目录，不在 resources/app.asar 中写 */
	const appPath = app.getAppPath();
	if( appPath.endsWith( 'app.asar' ) ) {
		return app.getPath( 'userData' );
	}
	/* dev 模式: 项目根即 ChatAIO */
	return appPath;
}

import { useIpcRendererToMain } from '#main/services/ipc';
