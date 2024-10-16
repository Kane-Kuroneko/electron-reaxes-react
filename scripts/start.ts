/**
 * build-renderer
 */
const startRendererServer = async( conf: Configuration ) => {
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
		console.warn( "WDS可能意外退出了!" );
		return Promise.reject( e );
	}
};


const buildPreload = async (conf: Configuration) => {
	return webpack_promise( conf ).
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
	return webpack_promise( conf ).
	then( ( { stats } ) => {
		console.log( chalk.green( `Electron-Main打包成功` ) );
	} ).
	catch( ( reason ) => {
		console.log( reason );
		console.log( chalk.red( `electron主进程打包失败,请在inspect模式下查看详情` ) );
		throw reason;
	} );
};



startRendererServer( webpack_conf_for_electron_renderer ).
then( () => buildPreload( webpack_conf_for_electron_preload ) ).
then( () => buildMain( webpack_conf_for_electron_main ) ).
then( () => {
	console.log(chalk.green('启动成功!'));

} ).catch(e => {
	console.log('打包失败!',purdy(e));
});
import purdy from 'purdy';
import { webpack_conf_for_electron_main , webpack_conf_for_electron_renderer ,webpack_conf_for_electron_preload } from "./mixedRepoWebpackConf";

import { port , project , mock , env , node_env , method , analyze , experimental } from "../engine/toolkit";
import { getPort , getIPV4address , webpack_promise } from "../engine/utils";
import { merge } from "webpack-merge";
import WebpackDevServer from "webpack-dev-server";
import chalk from "chalk";
import webpack , { Configuration } from "webpack";
import path from "node:path";
import { exec } from 'child_process';
