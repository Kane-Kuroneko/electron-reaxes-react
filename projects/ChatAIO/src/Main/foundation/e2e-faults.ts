/**
 * E2E 故障收集。必须由 e2e-bootstrap 在 before-launch 依赖图之前安装：
 * 1. Electron 默认会弹「A JavaScript error occurred in the main process」，Playwright 看不见。
 * 2. 内存数组 + evaluate 在进程已死 / 模态框卡住主线程时读不到。
 * 3. 因此同时写 userData/e2e-faults.jsonl，测试侧关进程后再读。
 * 设计：docs/features/e2e-playwright.md
 */

const E2E_FAULTS_FILE = 'e2e-faults.jsonl';
const e2eFaults : string[] = [];
let faultCollectorInstalled = false;

const OWN_RENDERER_RE = /(?:^|\/)(?:MainView|GuidingView|DropdownView|FloatingView|SettingsView|PromptView)(?:\/|$)/i;
const IGNORABLE_GONE_REASONS = new Set( [ 'clean-exit' , 'killed' ] );

export const installE2EFaultCollector = () => {
	if( isChatAioE2E() === false || faultCollectorInstalled ) {
		return;
	}
	faultCollectorInstalled = true;
	process.on( 'uncaughtException' , ( error ) => {
		recordE2EFault( 'uncaughtException' , error );
	} );
	process.on( 'unhandledRejection' , ( reason ) => {
		recordE2EFault( 'unhandledRejection' , reason );
	} );
	patchElectronErrorDialog();
	listenElectronProcessGone();
	listenWebContentsCreated();
};

export const recordE2EFault = (source:string , error:unknown) => {
	if( isChatAioE2E() === false ) {
		return;
	}
	if( isAppQuitting() ) {
		return;
	}
	const message = error instanceof Error
		? ( error.stack || error.message )
		: String( error );
	const line = `${ source }: ${ message }`;
	e2eFaults.push( line );
	persistE2EFault( source , message );
	console.error( `[E2E] ${ source }:` , error );
};

export const peekE2EFaults = () => {
	return [ ...e2eFaults ];
};

export const drainE2EFaults = () => {
	return e2eFaults.splice( 0 , e2eFaults.length );
};

const persistE2EFault = (source:string , message:string) => {
	const filePath = resolveE2EFaultsFilePath();
	if( !filePath ) {
		return;
	}
	try {
		fs.appendFileSync(
			filePath ,
			`${ JSON.stringify( { t : Date.now() , source , message } ) }\n`,
		);
	} catch {
		/* 目录尚未就绪时只保留内存；fixture 仍会 drain 探针 */
	}
};

const resolveE2EFaultsFilePath = () => {
	const fromEnv = process.env.CHATAIO_E2E_USER_DATA_DIR;
	if( fromEnv ) {
		return path.join( fromEnv , E2E_FAULTS_FILE );
	}
	try {
		return path.join( app.getPath( 'userData' ) , E2E_FAULTS_FILE );
	} catch {
		return null;
	}
};

const isAppQuitting = () => {
	return ( app as { __chatAIOQuitting? : boolean } ).__chatAIOQuitting === true;
};

/**
 * Electron / electron-log 都可能走 dialog.showErrorBox。
 * 这是用户看到的原生弹窗；Playwright 点不到，evaluate 也会被模态卡住。
 * E2E 只记账、不真正弹窗。
 */
const patchElectronErrorDialog = () => {
	const originalShowErrorBox = dialog.showErrorBox.bind( dialog );
	dialog.showErrorBox = ( title , content ) => {
		recordE2EFault( 'dialog.showErrorBox' , `${ title }\n${ content }` );
		if( isChatAioE2E() ) {
			return;
		}
		originalShowErrorBox( title , content );
	};
};

const listenElectronProcessGone = () => {
	app.on( 'render-process-gone' , ( _event , webContents , details ) => {
		if( IGNORABLE_GONE_REASONS.has( details.reason ) ) {
			return;
		}
		const url = readWebContentsUrl( webContents );
		if( isOwnRendererUrl( url ) === false ) {
			return;
		}
		recordE2EFault(
			'render-process-gone' ,
			`${ details.reason } exit=${ details.exitCode } url=${ url }`,
		);
	} );
	app.on( 'child-process-gone' , ( _event , details ) => {
		if( IGNORABLE_GONE_REASONS.has( details.reason ) ) {
			return;
		}
		if( details.type === 'GPU' || details.type === 'Zygote' || details.type === 'Sandbox helper' ) {
			return;
		}
		if( details.reason !== 'crashed' && details.reason !== 'oom' && details.reason !== 'integrity-failure' ) {
			return;
		}
		recordE2EFault(
			'child-process-gone' ,
			`${ details.type } ${ details.reason } exit=${ details.exitCode }`,
		);
	} );
};

const listenWebContentsCreated = () => {
	app.on( 'web-contents-created' , ( _event , webContents ) => {
		webContents.on( 'preload-error' , ( _e , preloadPath , error ) => {
			recordE2EFault( 'preload-error' , `${ preloadPath }\n${ error?.stack || error }` );
		} );
	} );
};

const readWebContentsUrl = (webContents:WebContents) => {
	try {
		return webContents.isDestroyed() ? '' : ( webContents.getURL() || '' );
	} catch {
		return '';
	}
};

const isOwnRendererUrl = (url:string) => {
	if( !url ) {
		return false;
	}
	return OWN_RENDERER_RE.test( url );
};

import { isChatAioE2E } from './e2e-mode';
import { app , dialog , type WebContents } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
