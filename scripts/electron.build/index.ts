const {
	absolutelyPath_subproject,
	name_subproject,
} = getProjectPaths.default;

const electronBuilderCliPath = createRequire( import.meta.url ).resolve( 'electron-builder/cli.js' );
const electronBuilderArgs = getElectronBuilderArgs();

try {
	await resetElectronBuildOutput();
} catch( error ) {
	console.error( '[ElectronBuild] failed to reset __Bin:' , error instanceof Error ? error.message : error );
	process.exitCode = 1;
}

if( !process.exitCode ) {
	console.log( `[ElectronBuild] project: ${ name_subproject }` );
	console.log( `[ElectronBuild] cwd: ${ absolutelyPath_subproject }` );
	console.log( `[ElectronBuild] electron-builder ${ electronBuilderArgs.join( ' ' ) }` );

	try {
		process.exitCode = await spawnElectronBuilder();
		if( process.exitCode === 0 ) {
			refreshWindowsIconCacheAfterBuild();
		}
	} catch( error ) {
		console.error( '[ElectronBuild] electron-builder failed to start:' , error );
		process.exitCode = 1;
	}
}

function getElectronBuilderArgs() {
	const forwardedArgsDelimiterIndex = process.argv.indexOf( '--' );
	if( forwardedArgsDelimiterIndex >= 0 ) {
		const forwardedArgs = process.argv.slice( forwardedArgsDelimiterIndex + 1 );
		if( forwardedArgs.length ) {
			return forwardedArgs;
		}
	}
	// yarn 1.x 会吃掉 -- 分隔符，导致 --mac/--win/--linux 直接出现在 process.argv 中
	// 因此也检查除 project name 之外的显式平台参数
	const knownPlatformFlags = [ '--mac' , '--win' , '--linux' , '-m' , '-w' , '-l' , '--arm64' , '--x64' ];
	// 从第四个参数开始（0=node,1=script,2=projectName）检查是否有已知平台标志
	const extraArgs = process.argv.slice( 3 ).filter( ( arg ) =>
		knownPlatformFlags.some( ( flag ) => arg.startsWith( flag ) )
	);
	if( extraArgs.length > 0 ) {
		// 如果同时出现 --mac --arm64 等参数，直接透传给 electron-builder
		return extraArgs;
	}
	// 默认构建当前宿主平台
	const platformFlag = process.platform === 'win32'
		? '-w'
		: process.platform === 'darwin'
			? '-m'
			: '-l';
	return [ 'build' , platformFlag ];
}

async function resetElectronBuildOutput() {
	const outputPath = path.resolve( absolutelyPath_subproject , '__Bin' );
	if( path.dirname( outputPath ) !== path.resolve( absolutelyPath_subproject ) || path.basename( outputPath ) !== '__Bin' ) {
		throw new Error( `[ElectronBuild] Refuse to remove unexpected path: ${ outputPath }` );
	}
	if( !fs.existsSync( outputPath ) ) {
		console.log( `[ElectronBuild] __Bin absent, skip reset: ${ outputPath }` );
		return;
	}

	// Node's fs.rm maxRetries is ignored on Windows; implement our own backoff.
	// Common lockers: running ChatAIO.exe, Explorer previewing __Bin, AV scanners.
	const maxAttempts = 10;
	let lastError: unknown;
	for( let attempt = 1; attempt <= maxAttempts; attempt++ ) {
		try {
			clearReadonlyTree( outputPath );
			fs.rmSync( outputPath , {
				recursive : true ,
				force : true,
			} );
			console.log( `[ElectronBuild] reset __Bin: ${ outputPath }` );
			return;
		} catch( error ) {
			lastError = error;
			const code = ( error as NodeJS.ErrnoException )?.code;
			const retryable = code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY' || code === 'EACCES';
			if( !retryable || attempt === maxAttempts ) {
				break;
			}
			const delayMs = 200 * attempt;
			console.warn( `[ElectronBuild] __Bin locked (${ code }), retry ${ attempt }/${ maxAttempts } in ${ delayMs }ms...` );
			await sleep( delayMs );
		}
	}

	throw new Error(
		`Cannot remove ${ outputPath }\n` +
		`Reason: ${ lastError instanceof Error ? lastError.message : String( lastError ) }\n` +
		`Close ChatAIO / any Explorer window inside __Bin, then retry.` ,
	);
}

function clearReadonlyTree( root:string ) {
	if( process.platform !== 'win32' || !fs.existsSync( root ) ) {
		return;
	}
	const stack = [ root ];
	while( stack.length ) {
		const current = stack.pop()!;
		try {
			const stat = fs.lstatSync( current );
			if( stat.isDirectory() ) {
				for( const name of fs.readdirSync( current ) ) {
					stack.push( path.join( current , name ) );
				}
			}
			// clear read-only bit so rm can succeed after AV / Explorer touch
			fs.chmodSync( current , 0o666 );
		} catch {
			// best-effort; rm retry loop handles remaining failures
		}
	}
}

function sleep( ms:number ) {
	return new Promise<void>( ( resolve ) => setTimeout( resolve , ms ) );
}

function spawnElectronBuilder() {
	return new Promise<number>( ( resolve , reject ) => {
		const electronBuilderProcess = spawn( process.execPath , [
			electronBuilderCliPath ,
			...electronBuilderArgs,
		] , {
			cwd : absolutelyPath_subproject ,
			stdio : 'inherit' ,
			env : process.env,
		} );

		electronBuilderProcess.on( 'close' , ( code , signal ) => {
			if( signal ) {
				console.error( `[ElectronBuild] electron-builder closed by signal: ${ signal }` );
				resolve( 1 );
				return;
			}
			resolve( code ?? 1 );
		} );

		electronBuilderProcess.on( 'error' , reject );
	} );
}

/**
 * Windows Explorer 会按路径缓存 exe 图标；换 icon 后同路径重建常仍显示旧图。
 * `ie4uinit.exe -show`（Win10/11）足以刷新 shell 图标关联，无需杀 explorer。
 * 杀 explorer / 删 IconCache.db 过重（任务栏闪断、关资源管理器窗口），仅作人工兜底，不默认执行。
 */
function refreshWindowsIconCacheAfterBuild() {
	if( process.platform !== 'win32' ) {
		return;
	}
	try {
		spawn( 'ie4uinit.exe' , [ '-show' ] , {
			detached : true ,
			stdio : 'ignore' ,
			windowsHide : true,
		} ).unref();
		console.log( '[ElectronBuild] refreshed Windows icon cache (ie4uinit -show)' );
	} catch( error ) {
		console.warn( '[ElectronBuild] failed to refresh Windows icon cache:' , error );
	}
}

import { getProjectPaths } from '../../engine/toolkit/project-paths';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
