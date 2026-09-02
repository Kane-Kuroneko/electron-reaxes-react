export const createDevRendererEntryURL = (
	entry:AIWebAppRendererEntryName ,
	query:RendererEntryQuery = {},
) => {
	const url = new URL( `https://localhost:${ __DEV_PORT__ }/${ entry }/` );
	url.searchParams.set( 't' , Date.now().toString() );
	Object.entries( query ).forEach( ( [ key , value ] ) => {
		if( value === null || typeof value === 'undefined' ) {
			return;
		}
		url.searchParams.set( key , String( value ) );
	} );
	return url.toString();
};

export const getRendererEntryFilePath = (
	absAppRunningPath:string ,
	entry:AIWebAppRendererEntryName,
) => {
	return path.join( absAppRunningPath , 'renderer' , entry , 'index.html' );
};

export const toLoadFileQuery = (query:RendererEntryQuery = {}) => {
	const result:Record<string , string> = {};
	Object.entries( query ).forEach( ( [ key , value ] ) => {
		if( value === null || typeof value === 'undefined' ) {
			return;
		}
		result[key] = String( value );
	} );
	return result;
};

export const getFreshRendererLoadURLOptions = (url:string) => {
	if( shouldUseDevRendererServer() === false || !url.startsWith( `https://localhost:${ __DEV_PORT__ }/` ) ) {
		return undefined;
	}
	return {
		extraHeaders : [
			'Cache-Control: no-cache',
			'Pragma: no-cache',
		].join( '\n' ),
	};
};

/**
 * 统一加载本地 renderer：dev 走 webpack HTTPS；E2E / 生产走 dist/renderer 文件。
 * 设计：docs/features/e2e-playwright.md
 */
export const loadRendererEntry = async(
	webContents:WebContents ,
	entry:AIWebAppRendererEntryName ,
	absAppRunningPath:string ,
	query:RendererEntryQuery = {} ,
	context:string = entry,
) => {
	if( shouldUseDevRendererServer() ) {
		return loadDevRendererEntryWithRetry( webContents , entry , query , context );
	}
	if( !webContents || webContents.isDestroyed() ) {
		return false;
	}
	const fileQuery = toLoadFileQuery( query );
	try {
		await webContents.loadFile(
			getRendererEntryFilePath( absAppRunningPath , entry ) ,
			Object.keys( fileQuery ).length ? { query : fileQuery } : undefined,
		);
		return true;
	} catch ( error ) {
		console.warn( `[RendererEntry] ${ context } loadFile failed:` , error );
		return false;
	}
};

/**
 * Dev：webpack HTTPS 可能晚于 Electron 启动（或热更新瞬间掉线）。
 * 对 localhost shell 入口做有限重试，避免 MainView/menubar 一次 CONNECTION_REFUSED 后永久空白，
 * 同时远程 AI 页已开始加载造成「menubar 被 AI 挡住」的假象。
 */
export const loadDevRendererEntryWithRetry = async(
	webContents:WebContents ,
	entry:AIWebAppRendererEntryName ,
	query:RendererEntryQuery = {} ,
	context:string = entry ,
	options:LoadDevRendererRetryOptions = {},
) => {
	if( shouldUseDevRendererServer() === false ) {
		return false;
	}
	if( !webContents || webContents.isDestroyed() ) {
		return false;
	}

	const maxAttempts = options.maxAttempts ?? 40;
	const delayMs = options.delayMs ?? 350;

	for( let attempt = 1; attempt <= maxAttempts; attempt++ ) {
		if( webContents.isDestroyed() ) {
			return false;
		}
		const url = createDevRendererEntryURL( entry , query );
		try {
			await webContents.loadURL( url , getFreshRendererLoadURLOptions( url ) );
			if( attempt > 1 ) {
				console.log( `[DevRenderer] ${ context } loaded after ${ attempt } attempts` );
			}
			return true;
		} catch ( error ) {
			if( !isRetryableDevRendererLoadError( error ) || attempt >= maxAttempts ) {
				console.warn( `[DevRenderer] ${ context } loadURL failed:` , url , error );
				return false;
			}
			getMenubarColdStartMonitor().note( 'phase-2-dev-retry' , {
				context ,
				attempt ,
				maxAttempts ,
				url ,
			} );
			if( attempt === 1 || attempt % 5 === 0 ) {
				console.warn(
					`[DevRenderer] ${ context } waiting for webpack (:${ __DEV_PORT__ })`
					+ ` retry ${ attempt }/${ maxAttempts }` ,
				);
			}
			await sleep( delayMs );
		}
	}
	return false;
};

const isRetryableDevRendererLoadError = (error:unknown) => {
	const err = error as { errno?:number; code?:string } | null;
	const errno = err?.errno;
	const code = err?.code;
	return (
		errno === -102
		|| errno === -101
		|| errno === -2
		|| code === 'ERR_CONNECTION_REFUSED'
		|| code === 'ERR_CONNECTION_RESET'
		|| code === 'ERR_FAILED'
	);
};

const sleep = (ms:number) => new Promise<void>( resolve => {
	setTimeout( resolve , ms );
} );

export type RendererEntryQuery = Record<string , string | number | boolean | null | undefined>;

type LoadDevRendererRetryOptions = {
	maxAttempts?: number;
	delayMs?: number;
};

import type { AIWebAppRendererEntryName } from '#shared/renderer-entries';
import { getMenubarColdStartMonitor } from '#main/reaxels/Views/Main-View/menubar-cold-start-monitor.retexel';
import { shouldUseDevRendererServer } from '#main/foundation/e2e-mode';
import type { WebContents } from 'electron';
import * as path from 'node:path';
