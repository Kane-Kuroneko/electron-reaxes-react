
export const devServerConf: Configuration = {
	port,
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
	liveReload:true,
	host: "0.0.0.0",
	allowedHosts: "all",
	historyApiFallback: true,
};

import { port , getProjectPaths , project , absolutelyPath_RepositoryRoot , absolutelyPath_Engine } from "../toolkit";
import { Configuration } from "webpack-dev-server";
import path from 'path';
