export * from "./js-test-module-exts";
export * from "./webpack-plugins";

/*封装webpack回调为promise*/
export const webpack_promise = (config:WebpackConfiguration) : Promise<{compiler:Compiler,error:Error,stats:Stats}> => {
	return new Promise((resolve, reject) => {
		const compiler = webpack(config, (error, stats) => {
			if (error == null) {
				resolve({ compiler, error, stats });
			} else if (stats?.hasErrors()) {
				throw stats.toJson().errors;
			} else {
				reject({
					error,
					stats,
				});
			}
		});
	});
};

/*返回本机的ipv4局域网地址*/
export const getIPV4address = () => {
	const network = os.networkInterfaces();

	for (const i in network) {
		for (const val of network[i]) {
			if (val.netmask === "255.255.255.0" && val.address.startsWith("192.168")) {
				return val.address;
			}
		}
	}
	return "127.0.0.1";
};

/*自动检查basePort的端口是否可用, 如果不可用则寻找相邻的可用端口作为wds服务器端口*/
export const getPort = (port) => {
	portfinder.basePort = parseInt(port) || 3000;
	return portfinder.getPortPromise();
};
/*反射:根据参数值来反射出相应参数名*/
export const reflect = <M extends Array<{
	regExp: RegExp | { test(input:string): boolean };
	key: string;
	proccessor?(input: string): unknown;
}>>(
	params: string[],
	matchers : M ,
) => {
	return params.reduce(
		(accumulator, current) => {
			matchers.forEach(({ regExp, key, proccessor }) => {
				if (regExp.test(current)) {
					accumulator[key] = proccessor ? proccessor(current) : current;
				}
			});
			return accumulator;
		},
		{} as Record<M[number]['key'], string>,
	);
};

import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import os from "os";
import webpack , {Compiler,Stats} from "webpack";
import portfinder from "portfinder";
