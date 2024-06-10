declare const RepoRoot: string;




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
