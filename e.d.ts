/*global provider*/
// declare const _ : typeof import('lodash');
// declare const React : typeof import('react');
declare const useLayoutEffect : typeof React.useLayoutEffect;
declare const useCallback : typeof React.useCallback;
// declare const useEffect : typeof React.useEffect;
// declare const useRef : typeof React.useRef;
// declare const reaxper : typeof React.useRef;

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
declare module '*.module.less'

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


declare const __REPO_ROOT__: string;

declare type ExtractData<T> = T extends any
	? any  // 如果是 any 类型的通道，返回 any 类型
	: {[K in keyof T]: { type: K; data: T[K] }}[keyof T];  // 提取出所有的 { type, data } 键值对


declare type WebpackConfiguration = import("webpack").Configuration;


// declare module "*.less" {
	// const content: { [className: string]: string };
	// export default content;
// }

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
declare module '*.gif' {
	const gif:string;
	export default gif;
}


declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.bmp';
// declare const orzPromise : typeof import('#utils').orzPromise;
// declare const crayon : typeof import('#generic/utils').crayon;
// declare const logProxy : typeof import('#utils').logProxy;
// declare const makePair : typeof import('#utils').makePair;
// declare const assert : typeof import('#utils').assert;
// declare const decodeQueryString : typeof import('#utils').decodeQueryString;
// declare const encodeQueryString : typeof import('#utils').encodeQueryString;
// declare const stringify : typeof import('#utils').stringify;
// declare const utils : typeof import('#utils');
