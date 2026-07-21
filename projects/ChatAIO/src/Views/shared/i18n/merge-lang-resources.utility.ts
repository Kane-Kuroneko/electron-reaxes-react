export type LangResourceMap = { [key: string]: string };

export const mergeLangResources = (
	...maps: Array<LangResourceMap | null | undefined>
): LangResourceMap => {
	return Object.assign( {} , ...maps.filter( Boolean ) );
};

export const loadMergedLangResources = async (
	...loaders: Array<() => Promise<LangResourceMap>>
): Promise<LangResourceMap> => {
	const maps = await Promise.all( loaders.map( ( load ) => load() ) );
	return mergeLangResources( ...maps );
};
