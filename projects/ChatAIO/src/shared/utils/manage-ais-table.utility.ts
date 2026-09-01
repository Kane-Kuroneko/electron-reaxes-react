/**
 * Settings → Manage AIs 表格的展示序 / 列筛选 / 拖拽映射。
 * 只影响表格看见的顺序；真实 `AIs` 数组顺序仍由启用槽位合并决定。
 * 设计：docs/features/manage-ais-table-ux.md
 */

export type ManageAIsColumnFilterKey = 'label' | 'AI_family' | 'url';

export type ManageAIsColumnFilters = Partial<Record<ManageAIsColumnFilterKey , string>>;

export const MANAGE_AIS_COLUMN_FILTER_KEYS : ManageAIsColumnFilterKey[] = [ 'label' , 'AI_family' , 'url' ];

export const createEmptyManageAIsColumnFilterOpen = () : Record<ManageAIsColumnFilterKey , boolean> => ( {
	label : false ,
	AI_family : false ,
	url : false ,
} );

export const createEmptyManageAIsColumnFilters = () : Record<ManageAIsColumnFilterKey , string> => ( {
	label : '' ,
	AI_family : '' ,
	url : '' ,
} );

const MANAGE_AIS_FILTER_GETTERS : Record<ManageAIsColumnFilterKey , ( record : {
	label? : string;
	AI_family? : string;
	url? : string;
} ) => string> = {
	label : record => record.label || '' ,
	AI_family : record => record.AI_family || '' ,
	url : record => record.url || '' ,
};

const arrayMoveIndex = <T ,>( list : T[] , from : number , to : number ) : T[] => {
	const next = list.slice();
	const [ item ] = next.splice( from , 1 );
	next.splice( to , 0 , item );
	return next;
};

/** 展示用：启用项保持相对序在上，未启用项保持相对序置底。不改传入数组。 */
export const partitionAIsEnabledFirst = <T extends { disabled? : boolean }>( ais : T[] ) : T[] => {
	if( !Array.isArray( ais ) ) {
		return [];
	}
	const enabled : T[] = [];
	const disabled : T[] = [];
	for( const ai of ais ) {
		if( ai.disabled ) {
			disabled.push( ai );
		} else {
			enabled.push( ai );
		}
	}
	return enabled.concat( disabled );
};

/** 列文本 AND 筛选。空字符串视为该列无条件。不改传入数组。 */
export const filterAIsByColumnText = <T extends {
	label? : string;
	AI_family? : string;
	url? : string;
}>( ais : T[] , filters : ManageAIsColumnFilters ) : T[] => {
	if( !Array.isArray( ais ) ) {
		return [];
	}
	const needles = ( Object.keys( MANAGE_AIS_FILTER_GETTERS ) as ManageAIsColumnFilterKey[] )
		.map( key => {
			const needle = ( filters[key] || '' ).trim().toLowerCase();
			return needle ? { key , needle } : null;
		} )
		.filter( Boolean ) as { key : ManageAIsColumnFilterKey; needle : string }[];
	if( needles.length === 0 ) {
		return ais.slice();
	}
	return ais.filter( record => {
		return needles.every( ( { key , needle } ) => {
			return MANAGE_AIS_FILTER_GETTERS[key]( record ).toLowerCase().includes( needle );
		} );
	} );
};

export const displayedManageAIs = <T extends {
	id : string;
	disabled? : boolean;
	label? : string;
	AI_family? : string;
	url? : string;
}>( ais : T[] , filters : ManageAIsColumnFilters ) : T[] => {
	return filterAIsByColumnText( partitionAIsEnabledFirst( ais ) , filters );
};

/**
 * 表内把启用项从 active 拖到 over：未启用项钉在真实数组原下标，只重排启用槽。
 * visibleAIs 是当前展示行（启用在上、未启用在下，可已列筛选）。
 * 被筛掉的启用项在启用序列里钉住，不会被这次拖拽挤走。
 * 拖到未启用行、或拖的是未启用行，返回 null（调用方应 no-op）。
 */
export const reorderEnabledAIsByVisualDrag = <T extends { id : string; disabled? : boolean }>(
	ais : T[] ,
	visibleAIs : T[] ,
	activeId : string ,
	overId : string ,
) : T[] | null => {
	if( !Array.isArray( ais ) || !Array.isArray( visibleAIs ) || !activeId || !overId ) {
		return null;
	}
	if( activeId === overId ) {
		return ais;
	}
	const byId = new Map( ais.map( ai => [ ai.id , ai ] as const ) );
	const active = byId.get( activeId );
	const over = byId.get( overId );
	if( !active || !over || active.disabled || over.disabled ) {
		return null;
	}

	const visibleEnabledIds = visibleAIs.filter( ai => !ai.disabled ).map( ai => ai.id );
	const from = visibleEnabledIds.indexOf( activeId );
	const to = visibleEnabledIds.indexOf( overId );
	if( from < 0 || to < 0 ) {
		return null;
	}

	const nextVisibleEnabledIds = arrayMoveIndex( visibleEnabledIds , from , to );
	const visibleSet = new Set( visibleEnabledIds );
	let nextVisibleIndex = 0;
	const nextEnabledIds = ais.filter( ai => !ai.disabled ).map( ai => {
		if( !visibleSet.has( ai.id ) ) {
			return ai.id;
		}
		return nextVisibleEnabledIds[nextVisibleIndex++];
	} );
	return mergeEnabledAIOrder( ais , nextEnabledIds );
};

import { mergeEnabledAIOrder } from './merge-enabled-ai-order.utility';
