const { ProvidePlugin } = webpack;

export const main = (
	//项目根目录,即`electron-reaxes-react`
	repoRootPath:string,
	//子工程目录,即/projects/Autohotkey-GUI/projects/War3
	subProjectRootPath:string
): Configuration => {
	
	return {
		entry: path.join(subProjectRootPath, "src/Main/index.tsx"),
		output: {
			path: path.join(subProjectRootPath, "dist"),
		},
		resolve :{
			alias : {
				'#main' : path.join(subProjectRootPath,'src/Main'),
				'#renderer' : path.join(subProjectRootPath,'src/Renderer'),
				'#project' : path.join(subProjectRootPath),
				// '#reaxels' : path.join(subProjectRootPath,'src/reaxels'),
			}
		},
		plugins : [
			// new CopyPlugin( {
				// patterns : [
					// { 
					// 	from : path.join( subProjectRootPath , 'package.json' ) , 
					// 	to : path.join( subProjectRootPath , 'dist/statics' ) 
					// } ,
					// {
					// 	from : path.join( subProjectRootPath , 'src/ahk-scripts' ) ,
					// 	to : path.join( subProjectRootPath , 'dist/statics/ahk-scripts' ) ,
					// } ,
				// ] ,
			// } ),
		],
	};
	
};

export const renderer = (
	//项目根目录,即`electron-reaxes-react`
	repoRootPath:string,
	//子工程目录,即/projects/Autohotkey-GUI/projects/War3
	subProjectRootPath:string
): Configuration => {
	return {
		stats : "errors-only",
		entry : {
			'AllocatorView' : path.join(subProjectRootPath,'src/Renderer/AllocatorView/index.tsx'),
			'DropPadView' : path.join(subProjectRootPath,'src/Renderer/DropPadView/index.tsx')
		},
		output : {
			path: path.join(subProjectRootPath, "dist"),
			filename : '[name]/index.js'
		},
		resolve :{
			alias : {
				'#main' : path.join(subProjectRootPath,'src/Main'),
				'#renderer' : path.join(subProjectRootPath,'src/Renderer'),
				'#project' : path.join(subProjectRootPath),
				// '#reaxels' : path.join(subProjectRootPath,'src/reaxels'),
			}
		},
		plugins : [
			//Allocator
			new HtmlWebpackPlugin( {
				template : path.join( subProjectRootPath , "assets/index.template.html" ) ,
				filename : 'AllocatorView/index.html' ,
				minify : false ,
				hash : true ,
				chunks:['AllocatorView']
			} ) ,
			//DropPad
			new HtmlWebpackPlugin( {
				template : path.join( subProjectRootPath , "assets/index.template.html" ) ,
				filename : 'DropPadView/index.html' ,
				minify : false ,
				hash : true ,
				chunks : ['DropPadView']
			} ) ,
		]
	} as Configuration;
};

export const preload  = (
	//项目根目录,即`electron-reaxes-react`
	repoRootPath:string,
	//子工程目录,即/projects/Autohotkey-GUI/projects/War3
	subProjectRootPath:string
): Configuration => {
	
	return {
		entry: path.join(subProjectRootPath, "src/preload.ts"),
	};
	
};


import path,{} from 'path';
import WatchFilePlugin from 'webpack-watch-files-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack , { Configuration } from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
