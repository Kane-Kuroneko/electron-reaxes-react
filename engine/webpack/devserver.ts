const { absolutelyPath_subprojectDist } = getProjectPaths();
export const devServerConf: Configuration = {
	port,
	static:{
		directory: absolutelyPath_subprojectDist,
		publicPath : '/',
	},
	hot: true,
	server: {
		type: "https",
		options: {
			cert: path.join(absolutelyPath_Engine,'cert/127.0.0.1+5.pem'),
			key: path.join(absolutelyPath_Engine,'cert/127.0.0.1+5-key.pem'),
			// cert: "./public/127.0.0.1+5.pem",
			// key: "./public/127.0.0.1+5-key.pem",
		},
	},
	devMiddleware : {
		writeToDisk : true,
	},
	headers : {
		'Cache-Control' : 'no-store, no-cache, must-revalidate, proxy-revalidate',
		'Pragma' : 'no-cache',
		'Expires' : '0',
	},
	liveReload:true,
	host: "0.0.0.0",
	allowedHosts: "all",
	historyApiFallback: {
		index : '/renderer/index.html',
	},
};

import { port , getProjectPaths , project , absolutelyPath_RepositoryRoot , absolutelyPath_Engine } from "../toolkit";
import { Configuration } from "webpack-dev-server";
import path from 'path';
