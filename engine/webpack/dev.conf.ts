const proxy_configuration = async () => {
	try {
		return (await import(path.join(absProjectRootDir, `packages/${repo}//proxy.configuration.json`), { assert: { type: "json" } })).default;
	} catch (e) {
		return [];
	}
};

export const webpackServerConfig = {
	stats: "errors-only",
	devServer: {
		static: {
			// directory : path.resolve(rootPath , 'dist')
		},
		compress: false,
		port,
		server: {
			type: "https",
			options: {
				cert: path.join(absEngineRootDir, "cert/127.0.0.1+5.pem"),
				key: path.join(absEngineRootDir, "cert/127.0.0.1+5-key.pem"),
			},
		},
		host: "0.0.0.0",
		hot: true,
		open: false,
		allowedHosts: "all",
		bonjour: true,
		historyApiFallback: true,
	},
	devtool: "source-map",
	optimization: {
		minimize: false,
	},
	plugins: [
		// new LogWhenSucceed('development'),
		new LoggerWebpackPlugn({
			initialize() {
				console.log(`webpack is starting...\n`);
			},
			done() {
				console.log(`compiled successfully\n`);
			},
		}),
	],
};

import { port, repo, absProjectRootDir, absEngineRootDir } from "../toolkit";

import path from "path";
import { LoggerWebpackPlugn, LogWhenSucceed } from "../toolkit";
