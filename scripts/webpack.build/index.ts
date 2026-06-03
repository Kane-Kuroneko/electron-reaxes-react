/**
 * 为生产环境打包dist目录,此脚本并非将代码打包为exe, electron.build才是
 */
resetBuildDist( getProjectPaths.default.absolutelyPath_subprojectDist , 'webpack-build' );

Promise.all( [
	webpack_conf_for_electron_renderer ? webpack_promise( webpack_conf_for_electron_renderer ) : Promise.resolve() ,
	webpack_conf_for_electron_preload ? webpack_promise( webpack_conf_for_electron_preload ) : Promise.resolve() ,
	webpack_promise( webpack_conf_for_electron_main ) ,
] ).
then( ( [ renderer , preload , main ] ) => {
	console.log(chalk.green('complete'));
	console.log(chalk.yellow('Open file to build Electron: ','electron-reaxes-react/package.json'));
} ).
catch( e => {
	console.log( chalk.red( 'fatal' ) );
	console.log( e );
} );

import chalk from 'chalk';
import { webpack_promise } from '../../engine/utils';
import { getProjectPaths } from '../../engine/toolkit';
import { webpack_conf_for_electron_main , webpack_conf_for_electron_preload , webpack_conf_for_electron_renderer } from '../utils/mixedRepoWebpackConf.ts';
import { resetBuildDist } from '../utils/build-artifacts';
