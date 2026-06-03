export * from "./js-test-module-exts";
export * from "./webpack-plugins";

/*封装webpack回调为promise*/
export const webpack_promise = (config:Configuration) : Promise<{compiler:Compiler,error:Error,stats:Stats}> => {
	return new Promise((resolve, reject) => {
		const compiler = webpack(config, (error, stats) => {
			if (stats?.hasErrors()) {
				reject(stats.toJson().errors);
			}else if(error){
				reject( error );
			}else {
				resolve({ compiler, error, stats });
			}
			// if (error == null) {
			//	
			// } else if (stats?.hasErrors()) {
			// 	throw stats.toJson().errors;
			// } else {
			// 	reject({
			// 		error,
			// 		stats,
			// 		_:stats.errors,
			// 	});
			// }
		});
	});
};

export const webpack_watch = (config:Configuration , handlers:WebpackWatchHandlers = {}) => {
	const compiler = webpack( {
		...config ,
		watch : false,
	} );
	let first = true;
	let settled = false;
	let watching = null as Watching;
	const firstDone = new Promise<WebpackWatchEvent>( ( resolve , reject ) => {
		watching = compiler.watch( config.watchOptions ?? {} , ( error , stats ) => {
			const hasErrors = Boolean( error || stats?.hasErrors() );
			const event:WebpackWatchEvent = {
				compiler ,
				watching ,
				first ,
				error : error ?? null ,
				stats : stats ?? null ,
				hasErrors ,
				errors : getWebpackWatchErrors( error , stats ),
			};
			if( hasErrors ) {
				handlers.failed?.( event );
				if( !settled ) {
					settled = true;
					reject( error ?? event.errors );
				}
			} else {
				handlers.done?.( event );
				if( !settled ) {
					settled = true;
					resolve( event );
				}
			}
			handlers.afterEach?.( event );
			first = false;
		} );
	} );
	return {
		compiler ,
		watching ,
		firstDone,
	};
};

const getWebpackWatchErrors = (error:Error | null | undefined , stats:Stats | null | undefined) => {
	if( error ) {
		return [ error ];
	}
	if( stats?.hasErrors() ) {
		return stats.toJson( {
			all : false ,
			errors : true ,
			errorDetails : true,
		} ).errors ?? [];
	}
	return [];
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
import webpack , {Compiler,Stats,Configuration,Watching} from "webpack";
import portfinder from "portfinder";

export type WebpackWatchEvent = {
	compiler: Compiler;
	watching: Watching;
	first: boolean;
	error: Error | null;
	stats: Stats | null;
	hasErrors: boolean;
	errors: unknown[];
};

export type WebpackWatchHandlers = {
	done?: (event:WebpackWatchEvent) => void;
	failed?: (event:WebpackWatchEvent) => void;
	afterEach?: (event:WebpackWatchEvent) => void;
};
