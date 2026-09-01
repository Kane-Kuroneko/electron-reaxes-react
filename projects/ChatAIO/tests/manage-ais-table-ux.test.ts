/**
 * Manage AIs 表格展示序 / 列筛选 / 拖启用项映射。
 * 契约见 docs/features/manage-ais-table-ux.md。
 * 运行：在 projects/ChatAIO 执行 `yarn test:ai-order`
 */

type Row = {
	id : string;
	disabled? : boolean;
	label : string;
	AI_family : string;
	url : string;
};

const ais = ( tokens : string ) : Row[] => {
	return tokens.split( ',' ).map( token => {
		const disabled = token.endsWith( '(d)' );
		const id = disabled ? token.slice( 0 , -3 ) : token;
		return {
			id ,
			disabled ,
			label : `name-${ id }` ,
			AI_family : id === 'C' ? 'claude' : 'chatgpt' ,
			url : `https://example.test/${ id }` ,
		};
	} );
};

const idsOf = ( rows : Row[] | null ) => {
	if( !rows ) {
		return null;
	}
	return rows.map( row => row.disabled ? `${ row.id }(d)` : row.id ).join( ',' );
};

describe( 'Manage AIs 展示序：未启用置底，不改真实数组' , () => {
	it( '启用保持相对序在上，未启用保持相对序在下' , () => {
		const disk = ais( 'A,B(d),C,D(d),E' );
		assert.equal( idsOf( partitionAIsEnabledFirst( disk ) ) , 'A,C,E,B(d),D(d)' );
		assert.equal( idsOf( disk ) , 'A,B(d),C,D(d),E' );
	} );

	it( '全启用或全未启用时展示序等于真实序' , () => {
		assert.equal( idsOf( partitionAIsEnabledFirst( ais( 'A,C,E' ) ) ) , 'A,C,E' );
		assert.equal( idsOf( partitionAIsEnabledFirst( ais( 'B(d),D(d)' ) ) ) , 'B(d),D(d)' );
	} );
} );

describe( 'Manage AIs 列筛选：只改展示' , () => {
	it( '多列 AND，不改传入数组' , () => {
		const disk = ais( 'A,B(d),C,D(d),E' );
		const shown = filterAIsByColumnText( partitionAIsEnabledFirst( disk ) , {
			label : 'name-c' ,
			AI_family : 'claude' ,
		} );
		assert.equal( idsOf( shown ) , 'C' );
		assert.equal( idsOf( disk ) , 'A,B(d),C,D(d),E' );
	} );

	it( '空条件等于不过滤' , () => {
		const disk = ais( 'A,B(d),C' );
		assert.equal(
			idsOf( displayedManageAIs( disk , { label : '  ' , url : '' } ) ) ,
			'A,C,B(d)' ,
		);
	} );
} );

describe( 'Manage AIs 拖启用项：未启用钉在真实下标' , () => {
	it( '展示 [A,C,E,B,D] 把 E 拖到 A 前 → 数据 [E,B,A,D,C]' , () => {
		const disk = ais( 'A,B(d),C,D(d),E' );
		const visible = partitionAIsEnabledFirst( disk );
		assert.equal( idsOf( visible ) , 'A,C,E,B(d),D(d)' );
		const next = reorderEnabledAIsByVisualDrag( disk , visible , 'E' , 'A' );
		assert.equal( idsOf( next ) , 'E,B(d),A,D(d),C' );
		assert.equal( next.find( row => row.id === 'B' )?.disabled , true );
		assert.equal( next.find( row => row.id === 'D' )?.disabled , true );
	} );

	it( '拖到未启用行或拖未启用行本身都拒绝，避免挤位' , () => {
		const disk = ais( 'A,B(d),C' );
		const visible = partitionAIsEnabledFirst( disk );
		assert.equal( reorderEnabledAIsByVisualDrag( disk , visible , 'A' , 'B' ) , null );
		assert.equal( reorderEnabledAIsByVisualDrag( disk , visible , 'B' , 'A' ) , null );
	} );

	it( '列筛选藏住的启用项在启用序列里钉住' , () => {
		const disk = ais( 'A,B(d),C,D(d),E' );
		const visible = displayedManageAIs( disk , { AI_family : 'chatgpt' } );
		assert.equal( idsOf( visible ) , 'A,E,B(d),D(d)' );
		const next = reorderEnabledAIsByVisualDrag( disk , visible , 'E' , 'A' );
		assert.equal( idsOf( next ) , 'E,B(d),C,D(d),A' );
	} );
} );

import {
	displayedManageAIs ,
	filterAIsByColumnText ,
	partitionAIsEnabledFirst ,
	reorderEnabledAIsByVisualDrag ,
} from '#shared/utils/manage-ais-table.utility';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
