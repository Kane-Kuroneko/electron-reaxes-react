/**
 * AI 列表排序：按产品契约回归，不锁内部函数切分。
 *
 * 契约见 docs/features/ai-list-reorder.md。
 * 本文件不覆盖 UI 手势（左键切页 / 右键拖 / footer 钉死）——那些在 DropdownView。
 *
 * 运行：在 projects/ChatAIO 执行 `yarn test:ai-order`
 */

type Row = {
	id : string;
	disabled? : boolean;
	label : string;
	proxy_mode : string;
};

const ais = ( ids : string ) : Row[] => {
	return ids.split( ',' ).map( token => {
		const disabled = token.endsWith( '(d)' );
		const id = disabled ? token.slice( 0 , -3 ) : token;
		return {
			id ,
			disabled ,
			label : `label-${ id }` ,
			proxy_mode : id === 'B' ? 'direct' : 'follow_global_setting',
		};
	} );
};

const idsOf = ( rows : Row[] | null ) => {
	if( !rows ) {
		return null;
	}
	return rows.map( row => row.disabled ? `${ row.id }(d)` : row.id ).join( ',' );
};

const persist = ( disk : Row[] , payload : string[] ) => {
	return resolveReorderedAIs( disk , payload );
};

const fieldKey = ( row : Row ) => {
	return `${ row.id }:${ row.label }:${ row.proxy_mode }:${ row.disabled === true }`;
};

const fieldsOf = ( rows : Row[] | null ) => {
	if( !rows ) {
		return null;
	}
	return [ ...rows ].sort( ( a , b ) => a.id.localeCompare( b.id ) ).map( fieldKey ).join( '|' );
};

const dirtyFingerprint = ( rows : Row[] , pendingDeleteIds : string[] = [] ) => {
	return JSON.stringify( snapshotAIsForDirty( rows , pendingDeleteIds ) );
};

describe( 'Switch AI 松手写盘' , () => {
	it( '只传 enabled id：disabled 占住原下标，enabled 相对序变，字段跟着 id 走' , () => {
		const disk = ais( 'A,B(d),C,D' );
		const next = persist( disk , [ 'D' , 'C' , 'A' ] );
		assert.equal( idsOf( next ) , 'D,B(d),C,A' );
		assert.equal( fieldsOf( next ) , fieldsOf( disk ) );
	} );

	it( '菜单顺序没变则磁盘不变' , () => {
		const disk = ais( 'A,B(d),C,D' );
		assert.equal( idsOf( persist( disk , [ 'A' , 'C' , 'D' ] ) ) , 'A,B(d),C,D' );
	} );

	it( '全部 enabled 时菜单列表就是全表，写盘结果等于菜单给出的序' , () => {
		assert.equal( idsOf( persist( ais( 'A,C,D' ) , [ 'D' , 'A' , 'C' ] ) ) , 'D,A,C' );
	} );
} );

describe( 'Manage AIs 松手写盘' , () => {
	it( '已提交全表 id（含 disabled）按拖拽后的表序落盘，字段跟着 id 走' , () => {
		const disk = ais( 'A,B(d),C' );
		const next = persist( disk , [ 'C' , 'A' , 'B' ] );
		assert.equal( idsOf( next ) , 'C,A,B(d)' );
		assert.equal( fieldsOf( next ) , fieldsOf( disk ) );
	} );

	it( 'payload 必须带上仍已提交的待删除行，否则 disabled 待删行不会跟着表走' , () => {
		const disk = ais( 'A,B(d),C' );
		const visual = ais( 'A,C,B(d)' );
		const committed = [ 'A' , 'B' , 'C' ];
		const pendingDelete = [ 'B' ];
		const payload = committedAIIdsInVisualOrder( visual , committed );
		assert.deepEqual( payload , [ 'A' , 'C' , 'B' ] );
		assert.equal( idsOf( persist( disk , payload ) ) , 'A,C,B(d)' );
		const wronglyDroppedPendingDelete = visual
			.filter( row => !pendingDelete.includes( row.id ) )
			.map( row => row.id );
		assert.notEqual( idsOf( persist( disk , wronglyDroppedPendingDelete ) ) , 'A,C,B(d)' );
	} );

	it( '未 Apply 的新建项不能进 payload；误送则拒绝写盘' , () => {
		const disk = ais( 'A,B(d),C' );
		const visual = [
			ais( 'C' )[0] ,
			{ id : 'New' , disabled : false , label : 'draft' , proxy_mode : 'direct' } ,
			ais( 'A' )[0] ,
			ais( 'B(d)' )[0] ,
		];
		const payload = committedAIIdsInVisualOrder( visual , [ 'A' , 'B' , 'C' ] );
		assert.deepEqual( payload , [ 'C' , 'A' , 'B' ] );
		assert.equal( persist( disk , [ 'C' , 'New' , 'A' , 'B' ] ) , null );
		assert.equal( idsOf( persist( disk , payload ) ) , 'C,A,B(d)' );
	} );

	it( '写盘后再套回 Settings：夹在中间的未保存新行仍在原槽，草稿字段保留' , () => {
		const disk = ais( 'A,B(d),C' );
		const visual = [
			ais( 'C' )[0] ,
			{ id : 'New' , disabled : false , label : 'draft' , proxy_mode : 'direct' } ,
			ais( 'A' )[0] ,
			ais( 'B(d)' )[0] ,
		];
		const persisted = persist(
			disk ,
			committedAIIdsInVisualOrder( visual , [ 'A' , 'B' , 'C' ] ),
		);
		assert.equal( idsOf( persisted ) , 'C,A,B(d)' );
		const local = applyEnabledAIOrder( visual , persisted!.map( row => row.id ) );
		assert.equal( idsOf( local ) , 'C,New,A,B(d)' );
		assert.equal( local.find( row => row.id === 'New' )?.label , 'draft' );
	} );
} );

describe( '非法 payload 不写盘' , () => {
	const disk = ais( 'A,B(d),C,D' );

	it( '缺、多、重复或未知 id 都拒绝' , () => {
		assert.equal( persist( disk , [ 'D' , 'A' ] ) , null );
		assert.equal( persist( disk , [ 'D' , 'C' , 'A' , 'B' , 'E' ] ) , null );
		assert.equal( persist( disk , [ 'D' , 'C' , 'D' ] ) , null );
		assert.equal( persist( disk , [ 'A' , 'C' , 'E' ] ) , null );
	} );

	it( 'enabled 列表里夹了 disabled，但又不是全表置换，拒绝写盘' , () => {
		assert.equal( persist( disk , [ 'D' , 'C' , 'B' ] ) , null );
	} );
} );

describe( 'Settings dirty：顺序不计，条目变更要计' , () => {
	it( '只改顺序不点亮 Apply' , () => {
		assert.equal(
			dirtyFingerprint( ais( 'C,A,B(d)' ) ) ,
			dirtyFingerprint( ais( 'A,B(d),C' ) ),
		);
	} );

	it( '改名或切换 disabled 仍 dirty' , () => {
		const original = ais( 'A,B(d),C' );
		const renamed = original.map( row => row.id === 'A' ? { ...row , label : 'renamed' } : row );
		const enabledB = original.map( row => row.id === 'B' ? { ...row , disabled : false } : row );
		assert.notEqual( dirtyFingerprint( renamed ) , dirtyFingerprint( original ) );
		assert.notEqual( dirtyFingerprint( enabledB ) , dirtyFingerprint( original ) );
	} );

	it( '待删除行会从 Apply 快照消失，因此仍 dirty' , () => {
		const original = ais( 'A,B(d),C' );
		assert.notEqual( dirtyFingerprint( original , [ 'B' ] ) , dirtyFingerprint( original ) );
	} );
} );

describe( 'ais-order-changed：Settings 自己当 sender 时不 echo' , () => {
	const settingsView = { isDestroyed : () => false };

	it( 'Settings 窗口就是 sender 时不回推，避免盖掉未保存新行' , () => {
		assert.equal( shouldEchoAIOrderToSettings( settingsView , settingsView ) , false );
	} );

	it( 'menubar 重排且 Settings 仍打开时要同步表格' , () => {
		assert.equal( shouldEchoAIOrderToSettings( { id : 'menubar' } , settingsView ) , true );
	} );

	it( 'Settings 没打开或已销毁时不 echo' , () => {
		assert.equal( shouldEchoAIOrderToSettings( { id : 'menubar' } , null ) , false );
		assert.equal( shouldEchoAIOrderToSettings( { id : 'menubar' } , { isDestroyed : () => true } ) , false );
	} );
} );

import {
	applyEnabledAIOrder ,
	committedAIIdsInVisualOrder ,
	resolveReorderedAIs ,
	shouldEchoAIOrderToSettings ,
	snapshotAIsForDirty,
} from '#shared/utils/merge-enabled-ai-order.utility';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
