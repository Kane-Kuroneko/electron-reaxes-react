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
				// '#reaxels' : path.join(subProjectRootPath,'src/reaxels'),
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

export const renderer = null;

export const preload = null;

import path,{} from 'path';
import WatchFilePlugin from 'webpack-watch-files-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack , { Configuration } from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
