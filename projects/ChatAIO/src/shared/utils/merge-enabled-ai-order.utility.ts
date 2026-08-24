/**
 * AI 列表排序（Switch AI 右键拖 / Settings 表拖）的纯函数。
 *
 * 契约见 docs/features/ai-list-reorder.md。改 reorder-ais 或 dirty 判定前先跑
 * `yarn test:ai-order`（ChatAIO package.json）。
 *
 * 两条写盘路径共用 resolveReorderedAIs：
 * - Switch AI 只传 enabled id → 槽位合并，disabled 下标不动
 * - Settings 传全表 id（含 disabled）→ 整表置换
 */

/** Switch AI：enabled 新序填回原 enabled 槽；disabled 保持下标。集合对不上返回 null。 */
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
 * reorder-ais 写盘决策：全表置换或 enabled 槽位合并，否则 null（不写盘）。
 */
export const resolveReorderedAIs = <T extends { id : string; disabled? : boolean }>(
	current : T[] ,
	orderedIds : string[] ,
) : T[] | null => {
	if( !Array.isArray( current ) || !Array.isArray( orderedIds ) ) {
		return null;
	}
	const byId = new Map( current.map( ai => [ ai.id , ai ] as const ) );
	const allIds = current.map( ai => ai.id );
	if( isIdPermutation( orderedIds , allIds ) ) {
		return orderedIds.map( id => byId.get( id )! );
	}
	return mergeEnabledAIOrder( current , orderedIds );
};

/** Settings dirty 快照用：去掉排列差异，只比较条目集合/字段。 */
export const canonicalizeAIsForDirtySnapshot = <T extends { id : string }>( ais : T[] ) : T[] => {
	return ais.slice().sort( ( a , b ) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0 );
};

/**
 * 把 payload 顺序套到本地 Settings 列表：只动两边都有的 id。
 * 未保存的新增项、以及 payload 未包含的 disabled 行留在原槽。
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
