const { IgnorePlugin } = webpack;
const { absolutelyPath_subprojectDist } = getProjectPaths.default;

export const electronPreloadConf: WebpackConfiguration = {
	target: 'electron-preload',
	mode: 'development',
	devtool : "cheap-source-map",
	output : {
		path: absolutelyPath_subprojectDist,
		filename: 'preload.js',
		library : {
			type : 'umd' ,
		} ,
	},
	resolve : {
		fallback : {
			fs: false,
			tls: false,
			net: false,
			path: false,
			zlib: false,
			http: false,
			https: false,
			stream: false,
			crypto: false,
		}
	},
	// externals : {
	// 	electron : 'require("electron")',
	// 	fs : 'require("node:fs")'
	// },
	externals : {
		// electron : 'require("electron")',
		// fs : 'require("fs")',
		// path : 'require("path")',
		// child_process : 'require("child_process")',
		
	},
	plugins : [
		// new NodePolyfillPlugin() ,
		// new IgnorePlugin( {
		// 	resourceRegExp : /^electron$/ ,
		// } ),
	],
	watch : true,
	
	node : {
		__dirname : false ,
		__filename : false ,
	} ,
};
import { getProjectPaths } from '../toolkit';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import webpack from 'webpack';
