const { ProvidePlugin } = webpack;

export const main = (
	//项目根目录,即`electron-reaxes-react`
	repoRootPath:string,
	//子工程目录,即/projects/Autohotkey-GUI/projects/War3
	subProjectRootPath:string
): Configuration => {
	
	return {
		entry: path.join(subProjectRootPath, "src/Main/index.ts"),
		output: {
			path: path.join(subProjectRootPath, "dist"),
		},
		resolve :{
			alias : {
				'#main' : path.join(subProjectRootPath,'src/Main'),
				'#renderer' : path.join(subProjectRootPath,'src/Renderer'),
				'#src' : path.join(subProjectRootPath,'src'),
			}
		},
		plugins : [
			// new CopyPlugin( {
			// patterns : [
			// { 
			//    from : path.join( subProjectRootPath , 'package.json' ) , 
			//    to : path.join( subProjectRootPath , 'dist/statics' ) 
			// } ,
			// {
			//    from : path.join( subProjectRootPath , 'src/ahk-scripts' ) ,
			//    to : path.join( subProjectRootPath , 'dist/statics/ahk-scripts' ) ,
			// } ,
			// ] ,
			// } ),
		],
	};
	
};


export const renderer = (repoRootPath: string, subProjectRootPath: string): Configuration => {
	return {
		// stats:"verbose",
		experiments: {
			topLevelAwait: true,  // 启用顶层 await
		},
		entry: {
			"SettingsView" : path.resolve(subProjectRootPath, "src/Views/SettingsView/index.tsx"),
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
			},
		},
		plugins : [
			new HtmlWebpackPlugin( {
				chunks:["SettingsView"],
				filename : 'SettingsView/index.html' ,
				template : path.join( subProjectRootPath , "engine/index.template.html" ) ,
				minify : false ,
				hash : true ,
				// inject: false,
			} ) ,
		],
	};
};

export const preload = ( repoRootPath: string , subProjectRootPath: string ): Configuration => {
	return {
		entry: path.join(subProjectRootPath, "src/preload.ts"),
	};
};
import path,{} from 'path';
import WatchFilePlugin from 'webpack-watch-files-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack , { Configuration } from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
