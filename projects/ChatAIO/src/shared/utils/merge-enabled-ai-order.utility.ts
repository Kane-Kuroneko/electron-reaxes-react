/**
 * AI 列表排序的产品契约函数（写盘 / dirty / echo / Settings payload）。
 * 交互与禁止项见 docs/features/ai-list-reorder.md。改前跑 `yarn test:ai-order`。
 *
 * 测试按用户可见结果锁契约，不要把内部槽位合并 / 全表置换拆成两套对偶用例。
 */

/** Switch AI / Manage AIs 拖启用项：enabled 新序填回原 enabled 槽；disabled 钉住下标。集合对不上返回 null。 */
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

const isIdPermutation = ( ids : string[] , universe : string[] ) => {
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
 * `reorder-ais` 写盘决策：payload 能解释成磁盘新序则返回新数组，否则 null（不写盘）。
 * Switch AI 给 enabled id。Manage AIs 松手后本地已按启用槽位合并，persist 仍送已提交全表 id
 * （含位置未动的 disabled / 待删除，不含未 Apply 新建项）。表内拖拽映射见 docs/features/manage-ais-table-ux.md。
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

/** Settings dirty：去掉排列差异，只比较条目集合/字段。 */
const canonicalizeAIsForDirtySnapshot = <T extends { id : string }>( ais : T[] ) : T[] => {
	return ais.slice().sort( ( a , b ) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0 );
};

/**
 * Apply/dirty 看到的 AIs：待删除行不在快照里，顺序不计。
 * 只改顺序时指纹不变；改名 / 启用 / 从快照拿掉一行必须变。
 */
export const snapshotAIsForDirty = <T extends { id : string }>(
	ais : T[] ,
	pendingDeleteIds : Iterable<string> = [] ,
) : T[] => {
	if( !Array.isArray( ais ) ) {
		return [];
	}
	const pending = pendingDeleteIds instanceof Set
		? pendingDeleteIds
		: new Set( pendingDeleteIds );
	const remaining = pending.size === 0
		? ais
		: ais.filter( ai => !pending.has( ai.id ) );
	return canonicalizeAIsForDirtySnapshot( remaining );
};

/**
 * Settings 松手写盘的 id 列表：按当前表序，只含已提交项。
 * 待删除仍已提交，必须带着走；未 Apply 的新建项不能进 `reorder-ais`。
 */
export const committedAIIdsInVisualOrder = <T extends { id : string }>(
	ais : T[] ,
	committedIds : ReadonlySet<string> | readonly string[] ,
) : string[] => {
	if( !Array.isArray( ais ) ) {
		return [];
	}
	const committed = committedIds instanceof Set
		? committedIds
		: new Set( committedIds );
	return ais.filter( ai => committed.has( ai.id ) ).map( ai => ai.id );
};

type SettingsOrderEchoTarget = {
	isDestroyed? : () => boolean;
} | null | undefined;

/**
 * menubar 重排成功后才把新序 echo 给已打开的 Settings。
 * Settings 自己当 sender 时禁止 echo：会盖掉未保存新建项或打断连续拖拽。
 */
export const shouldEchoAIOrderToSettings = (
	sender : unknown ,
	settingsWebContents : SettingsOrderEchoTarget ,
) : boolean => {
	if( !settingsWebContents ) {
		return false;
	}
	if( typeof settingsWebContents.isDestroyed === 'function' && settingsWebContents.isDestroyed() ) {
		return false;
	}
	return sender !== settingsWebContents;
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
