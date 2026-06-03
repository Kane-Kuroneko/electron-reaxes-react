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
			console.log( chalk.yellow( `Electron-Renderer打包成功` ) );
			console.log( chalk.yellow( `WDS已启动在https://${ getIPV4address() }:${ port }` ) );
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
import { createBuildStateWebpackPlugin , getBuildStatePath , resetBuildDist , resetBuildState } from '../utils/build-artifacts';

import { port , project , mock , env , node_env , method , analyze , experimental , getProjectPaths } from "../../engine/toolkit";
import { getPort , getIPV4address , webpack_promise , webpack_watch } from "../../engine/utils";
import { merge } from "webpack-merge";
import WebpackDevServer from "webpack-dev-server";
import chalk from "chalk";
import webpack , { Configuration } from "webpack";
import path from "node:path";
import { exec } from 'child_process';
