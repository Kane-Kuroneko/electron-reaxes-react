const {absolutelyPath_subprojectDist,name_subproject,absolutelyPath_subproject} = getProjectPaths.default;
//
let partialWebpackConf_Main : WebpackConfiguration = {} ,
	partialWebpackConf_Renderer : WebpackConfiguration = {}
;

try {
	const { main, renderer } = await import(path.join('file://',absolutelyPath_subproject,'partial.webpack-conf.ts'));
	partialWebpackConf_Main = main(absolutelyPath_RepositoryRoot, absolutelyPath_subproject);
	partialWebpackConf_Renderer = renderer(absolutelyPath_RepositoryRoot, absolutelyPath_subproject);
}catch (e){
	console.log(e);
	console.log('import path error: ',path.join('file://',absolutelyPath_subproject,'partial.webpack-conf.ts'));
}

let main_configs = [],
	renderer_configs = []
;
if(node_env === 'development'){
	main_configs = [
		webpackBaseConf,
		electronMainConf,
		electronDevConf_Main,
		partialWebpackConf_Main,
	]
	renderer_configs = [
		webpackBaseConf,
		electronRendererConf,
		electronDevConf_Renderer,
		{devServer: devServerConf },
		partialWebpackConf_Renderer
	]
}else if(node_env === 'production') {
	main_configs = [
		webpackBaseConf,
		electronMainConf,
		partialWebpackConf_Main,
	]
	renderer_configs = [
		webpackBaseConf,
		electronRendererConf,
		partialWebpackConf_Renderer,
	]
}
export const webpack_conf_for_electron_main = merge(main_configs);
export const webpack_conf_for_electron_renderer = merge(renderer_configs);

// purdy( webpack_conf_for_electron_renderer,{depth:3} );


import { project , getProjectPaths , env , node_env , absolutelyPath_RepositoryRoot } from "../engine/toolkit";
import { webpackBaseConf } from "../engine/webpack/base.conf";
import { electronMainConf } from "../engine/webpack/electron-main.conf";
import { electronRendererConf } from "../engine/webpack/electron-renderer.conf";
import { electronDevConf_Main , electronDevConf_Renderer } from '../engine/webpack/dev.conf';

import { devServerConf } from "../engine/webpack/devserver";
import { merge } from "webpack-merge";
import path from 'node:path';
import purdy from 'purdy';
