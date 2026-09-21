/**
 * 1.混合配置
 * 2.打包renderer , preload , main
 * 3.启动devserver
 * 4.此时可以从工程目录下启动electron .
 */

/**
 * build-renderer
 */
const { absolutelyPath_subprojectDist } = getProjectPaths.default;
const buildStatePath = getBuildStatePath( absolutelyPath_subprojectDist );
const activeWatchings = [];

const withBuildStatePlugin = (conf:Configuration , target:string , label:string , artifacts:string[] = []) => {
	if( !conf ) {
		return conf;
	}
	return {
		...conf ,
		plugins : [
			...( conf.plugins ?? [] ) ,
			createBuildStateWebpackPlugin( {
				statePath : buildStatePath ,
				target ,
				label ,
				artifacts,
			} ),
		],
	};
};

const runWebpackStartCompiler = (conf:Configuration , label:string) => {
	if( conf.watch ) {
		const watcher = webpack_watch( conf , {
			failed( event ) {
				if( event.first ) return;
				console.log( chalk.red( `${ label }重新打包失败` ) );
				console.log( event.errors );
			},
		} );
		activeWatchings.push( watcher.watching );
		return watcher.firstDone;
	}
	return webpack_promise( conf );
};

const startRendererServer = async( conf: Configuration ) => {
	if(!conf){
		console.log(chalk.green('不需要打包renderer\n'));
		return Promise.resolve();
	}
	try {
		const { compiler } = await webpack_promise( conf );
		const webpackServer = new WebpackDevServer( conf.devServer , compiler );
		return webpackServer.
		start().
		then( () => {
			/* listen 成功后的真实口写入本树 dist/.webpack-build-state.json；electron.start 只信这里。
			 * 设计：projects/ChatAIO/docs/architecture/worktree-dev-server.md
			 */
			const boundPort = readBoundDevServerPort( webpackServer , port );
			const origin = createDevRendererOrigin( boundPort );
			writeBuildStateDevServer( buildStatePath , {
				port : boundPort ,
				origin ,
				host : 'localhost' ,
				protocol : 'https' ,
				pid : process.pid ,
				boundAt : new Date().toISOString() ,
				inspectPort : worktreeDevScope.inspectPort ,
				cdpPort : worktreeDevScope.cdpPort ,
				worktree : worktreeDevScope.isLinkedWorktree,
			} );
			console.log( chalk.yellow( `Electron-Renderer打包成功` ) );
			console.log( chalk.yellow( `WDS已启动在https://${ getIPV4address() }:${ boundPort }` ) );
			if( boundPort !== port ) {
				console.warn( `[dev-scope] WDS 实际口 :${ boundPort } 与配置口 :${ port } 不一致，已把实际口写入 build-state.devServer` );
			}
		} ).
		catch( ( e ) => {
			console.error(e);
			throw e;
		} );
	} catch ( e ) {
		console.error( e );
		// console.warn( "WDS可能意外退出了!" );
		throw e;
	}
};

const readBoundDevServerPort = (webpackServer:WebpackDevServer , fallbackPort:number) => {
	const address = webpackServer.server?.address?.();
	if( address && typeof address === 'object' && Number.isInteger( address.port ) ) {
		return address.port;
	}
	return fallbackPort;
};


const buildPreload = async (conf: Configuration) => {
	if(!conf){
		console.log(chalk.green('不需要打包preload'));
		return Promise.resolve();
	}
	return runWebpackStartCompiler( conf , 'electron-preload' ).
	then( ( { stats } ) => {
		console.log( chalk.green( `Electron-Preload打包成功` ) );
	} ).
	catch( ( reason ) => {
		console.log( reason );
		console.log( chalk.red( `electron-preload打包失败,请在inspect模式下查看详情` ) );
		throw reason;
	} );
}

/**
 * build main
 */
const buildMain = async( conf: Configuration ) => {
	return runWebpackStartCompiler( conf , 'electron-main' ).
	then( ( { stats } ) => {
		console.log( chalk.green( `Electron-Main打包成功` ) );
	} ).
	catch( ( reason ) => {
		console.log( reason );
		console.log( chalk.red( `electron主进程打包失败,请在inspect模式下查看详情` ) );
		throw reason;
	} );
};

resetBuildDist( absolutelyPath_subprojectDist , 'webpack-start' );
resetBuildState( buildStatePath , 'webpack-start' );

const webpack_conf_for_electron_renderer_with_build_state = withBuildStatePlugin(
	webpack_conf_for_electron_renderer ,
	'electron-renderer' ,
	'electron renderer' ,
	[ path.join( absolutelyPath_subprojectDist , 'renderer' ) ]
);
const webpack_conf_for_electron_preload_with_build_state = withBuildStatePlugin(
	webpack_conf_for_electron_preload ,
	'electron-preload' ,
	'electron preload' ,
	[
		path.join( absolutelyPath_subprojectDist , 'preload.js' ) ,
		path.join( absolutelyPath_subprojectDist , 'ai-page-preload.js' ),
	]
);
const webpack_conf_for_electron_main_with_build_state = withBuildStatePlugin(
	webpack_conf_for_electron_main ,
	'electron-main' ,
	'electron main' ,
	[ path.join( absolutelyPath_subprojectDist , 'main.js' ) ]
);

startRendererServer( webpack_conf_for_electron_renderer_with_build_state ).
then( () => buildPreload( webpack_conf_for_electron_preload_with_build_state ) ).
then( () => buildMain( webpack_conf_for_electron_main_with_build_state ) ).
then( () => {
	console.log(chalk.green('打包成功，点击启动Electron Dev'));
	console.log('file://package.json:10');
	console.log("Run the script: ./run-electron-start.sh");
	// console.log("npm run electron-start:ahk-war3");
	// exec('npm run electron-start:ahk-war3')'\x1b]8;;file:///path/to/your/file\x1b\\Click to open file\x1b]8;;\x1b\\'
	
} ).catch(e => {
	console.log('打包失败!',purdy(e,{}));
	process.exit( 1 );
});


import purdy from 'purdy';
import { webpack_conf_for_electron_main , webpack_conf_for_electron_renderer ,webpack_conf_for_electron_preload } from "../utils/mixedRepoWebpackConf";
import { createBuildStateWebpackPlugin , getBuildStatePath , resetBuildDist , resetBuildState , writeBuildStateDevServer } from '../utils/build-artifacts';

import { port , worktreeDevScope , getProjectPaths } from "../../engine/toolkit";
import { createDevRendererOrigin } from "../../engine/toolkit/worktree-dev-scope";
import { getIPV4address , webpack_promise , webpack_watch } from "../../engine/utils";
import WebpackDevServer from "webpack-dev-server";
import chalk from "chalk";
import { Configuration } from "webpack";
import path from "node:path";
