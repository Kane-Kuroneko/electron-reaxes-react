/**
 * 为生产环境打包dist目录,此脚本并非将代码打包为exe, pack.ts才是
 */

webpack_promise(webpack_conf_for_electron_renderer).then(() => {
	
})

import { Worker } from 'node:worker_threads';
import { webpack_promise } from '../../engine/utils';

import {webpack_conf_for_electron_preload,webpack_conf_for_electron_renderer,webpack_conf_for_electron_main} from '../utils/mixedRepoWebpackConf.ts';
import { webpack } from 'webpack';
