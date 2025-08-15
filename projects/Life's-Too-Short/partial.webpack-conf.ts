const { ProvidePlugin } = webpack;

export const main = (
	//项目根目录,即`electron-reaxes-react`
	repoRootPath:string,
	//子工程目录,即/projects/Autohotkey-GUI/projects/War3
	subProjectRootPath:string
): WebpackConfiguration => {
	
	return {
		entry: path.join(subProjectRootPath, "src/main.ts"),
		output: {
			path: path.join(subProjectRootPath, "dist"),
			devtoolModuleFilenameTemplate: 'webpack:[namespace]/[resource-path][loaders]',
			pathinfo:false,
		},
		resolve :{
			alias : {
				'#main' : path.join(subProjectRootPath,'src/Main'),
				'#renderer' : path.join(subProjectRootPath,'src/Renderer'),
				'#src' : path.join(subProjectRootPath,'src'),
			}
		},
		plugins : [
			new CopyPlugin( {
				patterns : [
					{ 
						from : path.join( subProjectRootPath , 'package.json' ) , 
						to : path.join( subProjectRootPath , 'dist/statics' ) 
					} ,
					{
						from : path.join( subProjectRootPath , 'assets' ) ,
						to : path.join( subProjectRootPath , 'dist/statics/assets' ) ,
					} ,
					{
						from : path.join( repoRootPath , 'node_modules/regedit/vbs' ) ,
						to : path.join( subProjectRootPath , 'dist/statics/assets/vbs' ) ,
					} ,
				] ,
			} ),
			new ProvidePlugin( {
				'IPCLogger' : [ '#main/exports' , 'IPCLogger' ] ,
			} ),
		],
	};
	
};

export const renderer = (repoRootPath: string, subProjectRootPath: string): WebpackConfiguration => {
	return {
		// stats:"verbose",
		experiments: {
			topLevelAwait: true,  // 启用顶层 await
		},
		entry: {
			"main-chat" : path.resolve(subProjectRootPath, "src/Renderer/WindowFrames/Main-Chat/index.tsx"),
			"float-channels-chat" : path.resolve(subProjectRootPath, "src/Renderer/WindowFrames/Float-Channels-Chat/index.tsx"),
		},
		
		output: {
			path: path.join(subProjectRootPath, "dist/renderer"),
			filename : '[name]/main.js'
		},
		resolve :{
			alias : {
				'#main' : path.join(subProjectRootPath,'src/Main'),
				'#renderer' : path.join(subProjectRootPath,'src/Renderer'),
				'#src' : path.join(subProjectRootPath,'src'),
				'#Main-Chat' : path.join(subProjectRootPath,'src/Renderer/WindowFrames/Main-Chat'),
				'#Float-Channels-Chat' : path.join(subProjectRootPath,'src/Renderer/WindowFrames/Float-Channels-Chat'),
			}
		},
		plugins : [
			new HtmlWebpackPlugin( {
				chunks:["main-chat"],
				filename : 'main-chat/index.html' ,
				template : path.join( subProjectRootPath , "engine/index.template.html" ) ,
				minify : false ,
				hash : true ,
				// inject: false,
			} ) ,
			new HtmlWebpackPlugin( {
				chunks:["float-channels-chat"],
				filename : 'float-channels-chat/index.html' ,
				template : path.join( subProjectRootPath , "engine/index.template.html" ) ,
				minify : false ,
				hash : true ,
				// inject: false,
			} ) ,
			new WatchFilePlugin( {
				files : [
					path.join( subProjectRootPath , 'src/ahk-scripts/**' ),
				] ,
			} ) ,
			new ProvidePlugin( {
				
				'I18n' : [ '#renderer/reaxels/exports' , 'I18n' ] ,
				'i18n' : [ '#renderer/reaxels/exports' , 'i18n' ] ,
			} ),
		],
	};
};

export const preload = ( repoRootPath: string , subProjectRootPath: string ): WebpackConfiguration => {
	return {
		entry: path.join(subProjectRootPath, "src/preload.ts"),
	};
};


import type {Configuration as WebpackConfiguration} from 'webpack'
import path,{} from 'path';
import WatchFilePlugin from 'webpack-watch-files-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
