const {
	absolutelyPath_subproject,
	name_subproject,
} = getProjectPaths.default;

const electronBuilderCliPath = createRequire( import.meta.url ).resolve( 'electron-builder/cli.js' );
const electronBuilderArgs = getElectronBuilderArgs();

resetElectronBuildOutput();

console.log( `[ElectronBuild] project: ${ name_subproject }` );
console.log( `[ElectronBuild] cwd: ${ absolutelyPath_subproject }` );
console.log( `[ElectronBuild] electron-builder ${ electronBuilderArgs.join( ' ' ) }` );

try {
	process.exitCode = await spawnElectronBuilder();
} catch( error ) {
	console.error( '[ElectronBuild] electron-builder failed to start:' , error );
	process.exitCode = 1;
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

function resetElectronBuildOutput() {
	const outputPath = path.resolve( absolutelyPath_subproject , '__Bin' );
	if( path.dirname( outputPath ) !== path.resolve( absolutelyPath_subproject ) || path.basename( outputPath ) !== '__Bin' ) {
		throw new Error( `[ElectronBuild] Refuse to remove unexpected path: ${ outputPath }` );
	}
	fs.rmSync( outputPath , {
		recursive : true ,
		force : true,
	} );
	console.log( `[ElectronBuild] reset __Bin: ${ outputPath }` );
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

import { getProjectPaths } from '../../engine/toolkit/project-paths';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
