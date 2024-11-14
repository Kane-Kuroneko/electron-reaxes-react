/**
 * 为生产环境打包dist目录,此脚本并非将代码打包为exe, pack.ts才是
 */

Promise.all( [
	webpack_promise( webpack_conf_for_electron_renderer ) ,
	webpack_promise( webpack_conf_for_electron_preload ) ,
	webpack_promise( webpack_conf_for_electron_main ) ,
] ).
then( ( [renderer, main , preload ] ) => {
	console.log(chalk.green('complete'));
} ).
catch( e => {
	console.log( chalk.red( 'fatal' ) );
} );

import chalk from 'chalk';
import { webpack_promise } from '../../engine/utils';
import {webpack_conf_for_electron_preload,webpack_conf_for_electron_main,webpack_conf_for_electron_renderer} from '../utils/mixedRepoWebpackConf.ts';
import { register } from 'ts-node';
import { Worker } from 'node:worker_threads';
import { orzPromise } from 'reaxes-utils';
