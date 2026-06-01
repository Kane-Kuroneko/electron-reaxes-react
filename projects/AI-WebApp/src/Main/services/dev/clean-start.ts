export type DevCleanStartResult = {
	success: boolean;
	userDataPath: string;
	error?: string;
};

type CleanStartMarker = {
	target: string;
	createdAt: number;
};

export const requestDevCleanStart = ():DevCleanStartResult => {
	const userDataPath = app.getPath( 'userData' );
	if( !dev() ) {
		return {
			success : false ,
			userDataPath ,
			error : 'Clean start is only available in development mode.',
		};
	}
	try {
		writeCleanStartMarker( userDataPath );
		spawnCleanupHelper( userDataPath );
		( app as any ).__aiWebAppQuitting = true;
		setTimeout( () => {
			app.exit( 0 );
		} , 260 );
		return {
			success : true ,
			userDataPath,
		};
	} catch ( error ) {
		return {
			success : false ,
			userDataPath ,
			error : error?.message || String( error ),
		};
	}
};

export const applyPendingDevCleanStart = () => {
	const userDataPath = app.getPath( 'userData' );
	const markerPath = getCleanStartMarkerPath( userDataPath );
	if( !fs.existsSync( markerPath ) ) {
		return;
	}
	try {
		const marker = JSON.parse( fs.readFileSync( markerPath , 'utf-8' ) ) as CleanStartMarker;
		if( path.resolve( marker.target ) !== path.resolve( userDataPath ) ) {
			fs.rmSync( markerPath , { force : true } );
			console.warn( '[CleanStart] Ignored marker for different userData path:' , marker.target );
			return;
		}
		removePathWithRetrySync( userDataPath );
		fs.rmSync( markerPath , { force : true } );
		console.log( '[CleanStart] Applied pending userData cleanup:' , userDataPath );
	} catch ( error ) {
		console.warn( '[CleanStart] Failed to apply pending cleanup:' , error );
	}
};

const spawnCleanupHelper = (userDataPath:string) => {
	const scriptPath = path.join( app.getPath( 'temp' ) , `ai-webapp-clean-start-${ Date.now() }.cjs` );
	const logPath = scriptPath.replace( /\.cjs$/ , '.log' );
	const markerPath = getCleanStartMarkerPath( userDataPath );
	fs.writeFileSync( scriptPath , createNodeCleanupScript() , 'utf-8' );
	const child = spawn( process.execPath , [
		scriptPath ,
		String( process.pid ) ,
		userDataPath ,
		markerPath ,
		logPath,
	] , {
		detached : true ,
		stdio : 'ignore',
		windowsHide : true ,
		env : {
			...process.env ,
			ELECTRON_RUN_AS_NODE : '1',
		},
	} );
	child.unref();
};

const writeCleanStartMarker = (userDataPath:string) => {
	const markerPath = getCleanStartMarkerPath( userDataPath );
	fs.writeFileSync( markerPath , JSON.stringify( {
		target : userDataPath ,
		createdAt : Date.now(),
	} satisfies CleanStartMarker , null , 3 ) , 'utf-8' );
};

const getCleanStartMarkerPath = (userDataPath:string) => {
	return path.join( path.dirname( userDataPath ) , `.ai-webapp-clean-start-${ path.basename( userDataPath ) }.json` );
};

const removePathWithRetrySync = (target:string) => {
	for( let i = 0 ; i < 20 ; i++ ) {
		try {
			fs.rmSync( target , {
				recursive : true ,
				force : true ,
				maxRetries : 2 ,
				retryDelay : 80,
			} );
			if( !fs.existsSync( target ) ) {
				return;
			}
		} catch ( error ) {
			if( i === 19 ) {
				throw error;
			}
		}
	}
	throw new Error( `Failed to remove ${ target }` );
};

const createNodeCleanupScript = () => {
	return `
const fs = require('node:fs');

const mainPid = Number(process.argv[2]);
const target = process.argv[3];
const markerPath = process.argv[4];
const logPath = process.argv[5];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = message => {
	try {
		fs.appendFileSync(logPath, '[' + new Date().toISOString() + '] ' + message + '\\n');
	} catch {}
};
const isPidAlive = pid => {
	if(!pid) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

(async() => {
	log('clean-start target=' + target);
	for(let i = 0; i < 160 && isPidAlive(mainPid); i++) {
		await sleep(250);
	}
	await sleep(300);
	let removed = false;
	for(let i = 0; i < 120; i++) {
		try {
			fs.rmSync(target, { recursive: true, force: true, maxRetries: 2, retryDelay: 80 });
			removed = !fs.existsSync(target);
			if(removed) {
				log('removed target');
				break;
			}
			log('retry ' + i + ': target still exists');
		} catch(error) {
			log('retry ' + i + ': ' + (error && error.message || String(error)));
		}
		await sleep(300);
	}
	if(removed) {
		try { fs.rmSync(markerPath, { force: true }); } catch {}
	} else {
		log('failed: marker kept for next startup cleanup');
	}
	try { fs.rmSync(__filename, { force: true }); } catch {}
})().catch(error => {
	log('fatal: ' + (error && error.stack || error));
});
`.trimStart();
};

import { app } from 'electron';
import { dev } from 'electron-is';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
