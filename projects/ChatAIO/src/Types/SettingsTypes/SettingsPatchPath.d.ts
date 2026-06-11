/**
 * @example
 * sumbitPartialConfig('/networks/global_proxy/user_fill_proxy',{
 *
 * 	hostname : '',
 * 	port : 123,
 * 	protocol : 'http',
 * 	proxy_auth : false,
 * })
 */


//实现PatchData,使PatchData<'/networks/global_proxy/proxy_mode',Config> === NetworkProxy.ProxyMode
type SplitPath<S extends string> =
	S extends `/${ infer Rest }` ? SplitPath<Rest> :
		S extends `${ infer Head }/${ infer Tail }` ? [ Head , ...SplitPath<Tail> ] :
			S extends '' ? [] : [ S ];
type PatchDataByTuple<Path extends readonly string[] , D> =
	Path extends [ infer K , ...infer Rest ]
		? K extends keyof D
			? Rest extends []
				? D[K]
				: Rest extends string[]
					? PatchDataByTuple<Rest , D[K]>
					: never
			: never
		: never;

export type PatchData<T extends string, D> = PatchDataByTuple<SplitPath<T>, D>;


//创造一个泛型类型,使其可以做到通过
type JoinPath<Prefix extends string , Key extends string> =
	Prefix extends '' ? `/${ Key }` : `${ Prefix }/${ Key }`;
type AllPaths<T , Prefix extends string = ''> =
	T extends object
		? {
			[K in keyof T & string]: T[K] extends object
				? | JoinPath<Prefix , K>
				| AllPaths<T[K] , JoinPath<Prefix , K>>
				: JoinPath<Prefix , K>
		}[keyof T & string]
		: never;

export type PatchPath<T> = AllPaths<T , ''> extends infer P
	? P extends `/${ string }` ? P : never
	: never;
