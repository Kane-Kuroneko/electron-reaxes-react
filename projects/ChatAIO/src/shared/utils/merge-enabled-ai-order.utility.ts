/**
 * 将 enabled AI 的新顺序填回完整列表：disabled 项保持原下标，enabled 槽按 ids 依次替换。
 * 校验失败返回 null（缺/多/重复/含 disabled 或未知 id）。
 */
export const mergeEnabledAIOrder = <T extends { id : string; disabled? : boolean }>(
	ais : T[] ,
	enabledIds : string[] ,
) : T[] | null => {
	if( !Array.isArray( ais ) || !Array.isArray( enabledIds ) ) {
		return null;
	}

	const enabled = ais.filter( ai => !ai.disabled );
	if( enabledIds.length !== enabled.length ) {
		return null;
	}

	const enabledIdSet = new Set( enabled.map( ai => ai.id ) );
	const seen = new Set<string>();
	for( const id of enabledIds ) {
		if( typeof id !== 'string' || !id || !enabledIdSet.has( id ) || seen.has( id ) ) {
			return null;
		}
		seen.add( id );
	}
	if( seen.size !== enabledIdSet.size ) {
		return null;
	}

	const byId = new Map( enabled.map( ai => [ ai.id , ai ] as const ) );
	let nextEnabledIndex = 0;
	return ais.map( ai => {
		if( ai.disabled ) {
			return ai;
		}
		return byId.get( enabledIds[nextEnabledIndex++] )!;
	} );
};

export const enabledAIIdsEqual = ( a : string[] , b : string[] ) => {
	return a.length === b.length && a.every( ( id , index ) => id === b[index] );
};

export const isIdPermutation = ( ids : string[] , universe : string[] ) => {
	if( !Array.isArray( ids ) || !Array.isArray( universe ) || ids.length !== universe.length ) {
		return false;
	}
	const universeSet = new Set( universe );
	if( universeSet.size !== universe.length ) {
		return false;
	}
	const seen = new Set<string>();
	for( const id of ids ) {
		if( typeof id !== 'string' || !id || !universeSet.has( id ) || seen.has( id ) ) {
			return false;
		}
		seen.add( id );
	}
	return seen.size === universeSet.size;
};

/**
 * 把 enabledIds 的顺序套到本地列表上：只重排两边都有的 id，disabled / 未保存项留在原槽。
 * 给 Settings store 用，允许比磁盘多或少条目。
 */
export const applyEnabledAIOrder = <T extends { id : string }>(
	ais : T[] ,
	enabledIds : string[] ,
) : T[] => {
	if( !Array.isArray( ais ) || !Array.isArray( enabledIds ) || enabledIds.length === 0 ) {
		return ais;
	}

	const byId = new Map( ais.map( ai => [ ai.id , ai ] as const ) );
	const seen = new Set<string>();
	const knownIds = enabledIds.filter( id => {
		if( typeof id !== 'string' || !id || !byId.has( id ) || seen.has( id ) ) {
			return false;
		}
		seen.add( id );
		return true;
	} );
	if( knownIds.length === 0 ) {
		return ais;
	}

	const knownSet = new Set( knownIds );
	let nextIndex = 0;
	return ais.map( ai => {
		if( !knownSet.has( ai.id ) ) {
			return ai;
		}
		return byId.get( knownIds[nextIndex++] )!;
	} );
};
