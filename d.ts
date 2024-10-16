/*global provider*/
// declare const _ : typeof import('lodash');
declare const React : typeof import('react');
declare const useLayoutEffect : typeof React.useLayoutEffect;
declare const useCallback : typeof React.useCallback;
declare const Reaxlass : typeof import('reaxes-react').Reaxlass;
declare const Reaxes : typeof import('reaxes').Reaxes;

declare namespace ORZ {
	
	export type env = "server_dev"|"server_yang" | "server_production" | "unset"  ;
	
	export type RequestOptions<body extends () => Promise<F> ,F = any> = Omit<RequestInit, 'body'> & {
		env? : env,
		body?: body;
		mock? : boolean ;
	};
}

declare const __ENV_CONFIG__: {
	"env" : string,
	"proxy_path_dev" : string ,
	"proxy_path_server" : string ,
	"server_host" : string ,
	"path_rewrite" : {
		[p:string] : string,
	} ,
	"secure" : boolean,
}[];

declare const __IS_MOCK__: boolean;
declare const __DEV_PORT__: number;
declare const __EXPERIMENTAL__: boolean;
declare const __METHOD__: "server"|"build";
declare const __NODE_ENV__ : "development"|"production";
declare const __ENV__ : ORZ.env;
/*DOM*/
declare interface EventTarget {
	value?: string;
}
/*CSS*/
declare module '*.module.less' {
	const classes : {
		readonly [ key: string ]: string;
	};
	
	export default classes;
}
declare module '*.theme.less' {
	const theme : string;
	export default theme;
}

/*获取数组泛型参数*/
declare type ArrayElement<ArrayType extends any[]> = ArrayType extends (infer P)[] ? P : never;
declare interface NodeModule {
	hot?: {
		accept: Function;
	};
}


declare const RepoRoot: string;


declare type WebpackConfiguration = import("webpack").Configuration;



declare module '*.less' {
	const resource: {[key: string]: string};
	export = resource;
}
declare module '*.css' {
	const resource: {[key: string]: string};
	export = resource;
}

declare module '*.skel' {
	const str:string;
	export = str
}

declare module '*.atlas'{
	const str:string;
	export = str
}
