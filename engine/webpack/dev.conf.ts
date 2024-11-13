const {
	ProvidePlugin ,
	DefinePlugin,
} = webpack;
let first_main = true;
let first_renderer = true;
export const electronDevConf_Main:WebpackConfiguration = {
	stats: "errors-only",
	devtool: "source-map",
	optimization: {
		minimize: false,
	},
	mode : "development",
	watch : true,
	plugins : [
		new DefinePlugin({
			__DEV__ : JSON.stringify( true ),
		}),
		// new LogWhenSucceed('development'),
		new LoggerWebpackPlugn( {
			initialize() {
				// console.log(`webpack is starting...\n`);
			} ,
			done() {
				if( !first_main ) {
					console.log( `electron-main重新打包完成,${ dayjs().
					format( 'HH:mm:ss' ) }\n` );
				}
				first_main = false;
			} ,
		} ) ,
	],
	
};

export const electronDevConf_Renderer:WebpackConfiguration = {
	plugins : [
		new DefinePlugin({
			__DEV__ : JSON.stringify( true ),
		}),
		new LoggerWebpackPlugn({
			initialize() {
				// console.log(`webpack is starting...\n`);
			},
			done() {
				if(!first_renderer){
					console.log(`electron-renderer重新打包完成,${dayjs().format('HH:mm:ss')}\n`);
				}
				first_renderer = false;
			},
		}),
	]
}
import dayjs from 'dayjs';
import { port, project, absolutelyPath_RepositoryRoot, absolutelyPath_Engine,mock,env,node_env,method, experimental} from "../toolkit";
import webpack from 'webpack';
import path from "path";
import { LoggerWebpackPlugn, LogWhenSucceed } from "../toolkit";
