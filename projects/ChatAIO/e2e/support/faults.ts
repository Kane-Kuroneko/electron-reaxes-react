export const E2E_FAULTS_FILE = 'e2e-faults.jsonl';

export const PROCESS_FAULT_RE = /Uncaught Exception|A JavaScript error occurred|Cannot read propert(?:y|ies) of null|getContentBounds|uncaughtException|Unhandled[ _]Rejection|TypeError:|ReferenceError:/;

/* about:blank 让启动 AI 很快 settle，Settings preload 常和 app.exit 撞车；产品已 catch，stderr 仍带 TypeError。 */
const IGNORED_PROCESS_LOG_RE = /SettingsView preload failed|Object has been destroyed/;

export const collectProcessLogs = (electronApp:ElectronApplication) => {
	const logs : ElectronProcessLogs = {
		stdout : [] ,
		stderr : [],
	};
	electronApp.process().stdout?.on( 'data' , ( chunk ) => {
		const text = String( chunk );
		logs.stdout.push( text );
		if( process.env.CHATAIO_E2E_DEBUG === '1' ) {
			process.stdout.write( `[electron] ${ text }` );
		}
	} );
	electronApp.process().stderr?.on( 'data' , ( chunk ) => {
		const text = String( chunk );
		logs.stderr.push( text );
		if( process.env.CHATAIO_E2E_DEBUG === '1' ) {
			process.stderr.write( `[electron] ${ text }` );
		}
	} );
	return logs;
};

export const attachRendererPageErrors = (
	electronApp : ElectronApplication ,
	sink : string[],
) => {
	const attach = ( page:Page ) => {
		page.on( 'pageerror' , ( error ) => {
			const url = page.url();
			sink.push( `pageerror ${ url }: ${ error.stack || error.message }` );
		} );
	};
	electronApp.windows().forEach( attach );
	electronApp.on( 'window' , attach );
};

export const readPersistedE2EFaults = async( userDataDir:string ) => {
	const filePath = path.join( userDataDir , E2E_FAULTS_FILE );
	try {
		const text = await fs.promises.readFile( filePath , 'utf8' );
		return text.split( '\n' ).filter( Boolean ).map( ( line ) => {
			try {
				const row = JSON.parse( line ) as { source? : string; message? : string };
				if( row.source && row.message ) {
					return `${ row.source }: ${ row.message }`;
				}
			} catch {
				/* 非 JSON 行原样带回 */
			}
			return line;
		} );
	} catch {
		return [];
	}
};

export const formatElectronFaults = (faults:string[] , logs:ElectronProcessLogs) => {
	const blob = `${ logs.stderr.join( '' ) }\n${ logs.stdout.join( '' ) }`
		.split( /\r?\n/ )
		.filter( ( line ) => IGNORED_PROCESS_LOG_RE.test( line ) === false )
		.join( '\n' );
	const processHits = PROCESS_FAULT_RE.test( blob )
		? [ blob.trim().slice( -4000 ) ]
		: [];
	const all = uniqueFaults( [
		...faults.filter( ( line ) => IGNORED_PROCESS_LOG_RE.test( line ) === false ) ,
		...processHits,
	] );
	if( all.length === 0 ) {
		return null;
	}
	return `Electron reported faults while the test was green:\n${ all.join( '\n\n' ) }`;
};

const uniqueFaults = (faults:string[]) => {
	return [ ...new Set( faults.filter( Boolean ) ) ];
};

export type ElectronProcessLogs = {
	stdout : string[];
	stderr : string[];
};

import type { ElectronApplication , Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
