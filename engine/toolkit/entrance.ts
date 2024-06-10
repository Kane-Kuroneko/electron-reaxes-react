/**
 * 此文件是所有打包行为的入口,为后续流程提供依赖
 */
import { getPort, reflect } from "../utils";
import { fileURLToPath } from "url";
import path from "path";
import { merge } from "webpack-merge";
import {readdirSync} from 'fs';
export const args = process.argv.slice(2);

/*排除构建的包,不作为独立的package*/
export const excludedPackages = [];

export let {
	inputPort = 3333,
	repo = null,
	mock = null,
	analyze = false,
	method = "server",
	env = "unset",
	node_env = "development",
	experimental = "non-exp",
} = reflect(args, [
	{
		/*本应由正则判断,但这里将其伪造为正则调用test函数.*/
		regExp: {
			test(inputPort) {
				const num = parseInt(inputPort);
				return Number.isSafeInteger(num) && num >= 0 && num <= 65535;
			},
		},
		key: "inputPort" as const,
	},
	{
		regExp: /\bGamepad-Task-Manager|Linker|Proxy-Rules-Modifier\b/,
		key: "repo" as const,
	},
	{
		regExp: /\bmock\b/,
		key: "mock" as const,
	},
	{
		regExp: /\banalyze\b/,
		key: "analyze" as const,
	},
	{
		/*启动模式,构建还是本地服务*/
		regExp: /\bbuild|server\b/,
		key: "method" as const,
	},
	{
		/*网络请求环境*/
		regExp: /\bserver_dev|server_production\b/,
		key: "env" as const,
	},
	{
		/*webpack的mode*/
		regExp: /\bdevelopment|production\b/,
		key: "node_env" as const,
	},
	{
		/*是否开启实验特性*/
		regExp: /\bexperimental\b/i,
		key: "experimental" as const,
	},
]);
/*如果没有明确指定node_env:  npm.server下自动dev,npm.build是production*/
if ( !node_env ) {
	if(method === "server"){
		node_env = 'development';
	}else if (method === "build") {
		node_env = 'production';
	}else {
		node_env = 'development';
	}
}else if(node_env === "production"){
	
}

console.log(inputPort,222222);
export const port = await getPort(inputPort);
import {absProjectRootDir,absProjectRootFileURL} from './path';
/*只有在列表中声明的包才可以被运行*/
export const packageList = readdirSync(path.join(absProjectRootDir,"projects")).filter((_package) => {
	return !excludedPackages.includes(_package);
});
/*子repo的绝对路径,返回如:F:/electron-reaxes-react/projects/Linker/ */
export const absRepoRoot = path.join(absProjectRootDir, `projects/${repo}`);
if(!repo){
	throw "npm run build <<repo>> is nessessary";
}
/*非业务模块不可被打包,因为webpack.base.config.mjs里配置了对通用模块的alias,*/
if (packageList.every((repoName) => repoName !== repo)) {
  throw new Error(`this repo "${repo}" is not a valid business package`);
}


