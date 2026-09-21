const {
	absolutelyPath_subproject ,
	absolutelyPath_subprojectDist,
} = getProjectPaths.default;

// 根据平台解析 Electron 二进制文件路径
// macOS: node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
// Windows: node_modules/electron/dist/electron.exe
// Linux: node_modules/electron/dist/electron
const electronPackageDir = path.dirname(
	createRequire( import.meta.url ).resolve( 'electron/package.json' ),
);
const electronDistDir = path.join( electronPackageDir , 'dist' );
const electronBinaryName = process.platform === 'win32'
	? 'electron.exe'
	: process.platform === 'darwin'
		? path.join( 'Electron.app' , 'Contents' , 'MacOS' , 'Electron' )
		: 'electron';
const absolutelyElectronExe = path.join( electronDistDir , electronBinaryName );
const buildStatePath = getBuildStatePath( absolutelyPath_subprojectDist );

const sharedBuildSourcePaths = [
	path.join( absolutelyPath_subproject , 'partial.webpack-conf.ts' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'engine/babel/conf.ts' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'engine/webpack/base.conf.ts' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'engine/webpack/dev.conf.ts' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'engine/webpack/prod.conf.ts' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'scripts' , 'utils' , 'mixedRepoWebpackConf.ts' ),
];
const mainProcessSourcePaths = [
	path.join( absolutelyPath_subproject , 'src/Main' ) ,
	path.join( absolutelyPath_subproject , 'src/shared' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'generic-services' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'engine/webpack/electron-main.conf.ts' ) ,
	...sharedBuildSourcePaths,
];
const preloadSourcePaths = [
	path.join( absolutelyPath_subproject , 'src/preload.ts' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'generic-services' , 'toolkit' , 'electron' , 'preload.ipc.ts' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'engine/webpack/electron-preload.conf.ts' ) ,
	...sharedBuildSourcePaths,
];
const aiPagePreloadSourcePaths = [
	path.join( absolutelyPath_subproject , 'src/ai-page-preload.ts' ) ,
	path.join( absolutelyPath_RepositoryRoot , 'engine/webpack/electron-preload.conf.ts' ) ,
	...sharedBuildSourcePaths,
];

try {
	assertFreshElectronStartupArtifacts( {
		buildStatePath ,
		artifacts : [
			{
				label : 'main process bundle' ,
				path : path.join( absolutelyPath_subprojectDist , 'main.js' ),
				sourcePaths : mainProcessSourcePaths,
				buildStateTarget : 'electron-main',
			} ,
			{
				label : 'settings preload bundle' ,
				path : path.join( absolutelyPath_subprojectDist , 'preload.js' ),
				sourcePaths : preloadSourcePaths,
				buildStateTarget : 'electron-preload',
			} ,
			{
				label : 'AI page preload bundle' ,
				path : path.join( absolutelyPath_subprojectDist , 'ai-page-preload.js' ),
				sourcePaths : aiPagePreloadSourcePaths,
				buildStateTarget : 'electron-preload',
			},
		],
	} );
} catch ( error ) {
	console.error( error?.message || error );
	process.exit( 1 );
}

/* WDS 真实口只信本树 dist/.webpack-build-state.json。
 * inspect / CDP 仍从 9229 / 9222 起找空闲，不要跟 WDS 口绑成两万档。
 * 设计：projects/ChatAIO/docs/architecture/worktree-dev-server.md
 */
let devServer;
try {
	devServer = assertDevServerRendezvous( buildStatePath );
} catch ( error ) {
	console.error( error?.message || error );
	process.exit( 1 );
}

const inspectPreferred = parsePortNumber( process.env.ELECTRON_INSPECT_PORT )
	?? PRIMARY_INSPECT_PORT;
const inspectPort = await getPort( inspectPreferred );
const cdpPreferred = parsePortNumber( process.env.ELECTRON_CDP_PORT )
	?? PRIMARY_CDP_PORT;
const cdpPort = await getPort( cdpPreferred );

console.log(
	`[dev-scope] electron renderer ${ devServer.origin }`
	+ ` inspect :${ inspectPort }`
	+ ` cdp-hint :${ cdpPort }`
	+ ( devServer.worktree ? ' (worktree)' : '' ),
);

// 使用 spawn 来启动 Electron
const electronProcess = spawn(absolutelyElectronExe, ['.',`--inspect=${ inspectPort }`,'--experimental-network-inspection'], {
	cwd: absolutelyPath_subproject, // 设置当前工作目录为 subproject 路径
	stdio: 'inherit', // 忽略 stdin, 监听 stdout 和 stderr
	env :{
		...process.env,
		NODE_OPTIONS: '--enable-source-maps',
		NODE_TLS_REJECT_UNAUTHORIZED : '0',
		ELECTRON_RENDERER_URL : devServer.origin,
		DEV_SERVER_PORT : String( devServer.port ),
		ELECTRON_INSPECT_PORT : String( inspectPort ),
		ELECTRON_CDP_PORT : String( cdpPort ),
	}
});

/* 本文件有顶层 await（getPort）。tsx 在模块 evaluation 结束后会结束 Node；
 * Windows 作业对象会把还在跑的 Electron 一起杀掉，表现为 CLI 立刻 Done / exit 0。
 * 必须一直等到子进程 close，行为才和改端口前一致。
 * 设计：projects/ChatAIO/docs/architecture/worktree-dev-server.md
 */
const exitCode = await new Promise<number>( ( resolve ) => {
	electronProcess.once( 'error' , ( err ) => {
		console.error( `Electron process error: ${ err }` );
		resolve( 1 );
	} );
	electronProcess.once( 'close' , ( code ) => {
		console.log( `Electron process closed with code: ${ code }` );
		resolve( code ?? 1 );
	} );
} );
process.exit( exitCode );

import { assertDevServerRendezvous , assertFreshElectronStartupArtifacts , getBuildStatePath } from '../utils/build-artifacts';
import { PRIMARY_CDP_PORT , PRIMARY_INSPECT_PORT , parsePortNumber } from '../../engine/toolkit/worktree-dev-scope';
import { getPort } from '../../engine/utils';
import { absolutelyPath_RepositoryRoot } from '../../engine/toolkit/repo-paths';
import { getProjectPaths } from '../../engine/toolkit/project-paths';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
