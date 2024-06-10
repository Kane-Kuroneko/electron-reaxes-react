/**
 * - build-main
 * - build-renderer
 * 
 */


import {
	port ,
	repo ,
	mock ,
	env ,
	args ,
	node_env ,
	method ,
	analyze ,
	experimental ,
} from '../engine/toolkit';

console.log(repo,11111);
import {getPort,getIPV4address,webpack_promise} from '../engine/utils';
import { mixedRepoWebpackConf } from "./mixedRepoWebpackConf";
// import { webpackServerConfig } from '../build/webpack.devserver.config.mjs';
import { merge } from "webpack-merge";
import WebpackDevServer from 'webpack-dev-server';
import chalk from 'chalk';
import webpack from 'webpack';
