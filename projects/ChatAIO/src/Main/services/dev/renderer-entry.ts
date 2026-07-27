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

export const getFreshRendererLoadURLOptions = (url:string) => {
	if( !dev() || !url.startsWith( `https://localhost:${ __DEV_PORT__ }/` ) ) {
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
	if( !dev() ) {
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

type RendererEntryQuery = Record<string , string | number | boolean | null | undefined>;

type LoadDevRendererRetryOptions = {
	maxAttempts?: number;
	delayMs?: number;
};

import type { AIWebAppRendererEntryName } from '#src/shared/renderer-entries';
import { dev } from 'electron-is';
import type { WebContents } from 'electron';
import * as path from 'node:path';
