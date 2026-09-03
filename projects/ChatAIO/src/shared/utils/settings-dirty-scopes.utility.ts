/**
 * Settings 两套 dirty 的纯函数：页脚只看 runtime 配置，表底只看 AIs。
 * 交互见 docs/features/manage-ais-save-scopes.md。
 */

type RuntimeSettingsSlice = {
	networks : {
		proxy_test_urls? : unknown;
		[key : string] : unknown;
	};
	system : unknown;
	startup : unknown;
	appearance : unknown;
	AIs? : unknown;
};

/**
 * 页脚 dirty 快照：去掉 AIs 与即时持久化的测试 URL。
 */
export const snapshotRuntimeSettingsForDirty = <T extends RuntimeSettingsSlice>( settings : T ) => {
	const { AIs : _ais , ...rest } = settings;
	const networks = { ...rest.networks };
	delete networks.proxy_test_urls;
	return {
		...rest ,
		networks ,
	};
};

type AIRow = { id : string };

const sortKeysDeep = ( value : unknown ) : unknown => {
	if( Array.isArray( value ) ) {
		return value.map( sortKeysDeep );
	}
	if( value && typeof value === 'object' ) {
		return Object.fromEntries(
			Object.keys( value as object ).sort().map( ( key ) => {
				return [ key , sortKeysDeep( ( value as Record<string , unknown> )[key] ) ];
			} ),
		);
	}
	return value;
};

/**
 * 表级 dirty 指纹。键顺序不计，避免弹窗 merge `{...persisted, disabled}` 误点亮 Save。
 */
export const fingerprintAIsDirtyState = <T extends AIRow>(
	ais : T[] ,
	pendingDeleteIds : Iterable<string> = [] ,
) : string => {
	return JSON.stringify( sortKeysDeep( snapshotAIsForDirty( ais , pendingDeleteIds ) ) );
};

/**
 * 弹窗单条写盘后：committed 视图（不含 pending delete 过滤）的 dirty 指纹。
 * live 里未提交的其它行仍应和这份指纹对不上。
 */
export const fingerprintCommittedAIsForDirty = <T extends AIRow>(
	liveAIs : T[] ,
	committedIds : ReadonlySet<string> | readonly string[] ,
	committedSnapshot : ReadonlyMap<string , string> ,
) : string => {
	const committed = committedIds instanceof Set
		? committedIds
		: new Set( committedIds );
	const committedView = liveAIs
		.filter( ai => committed.has( ai.id ) )
		.map( ai => {
			const snap = committedSnapshot.get( ai.id );
			if( !snap ) {
				return ai;
			}
			try {
				return JSON.parse( snap ) as T;
			} catch {
				return ai;
			}
		} );
	return fingerprintAIsDirtyState( committedView , [] );
};

import { snapshotAIsForDirty } from './merge-enabled-ai-order.utility';
