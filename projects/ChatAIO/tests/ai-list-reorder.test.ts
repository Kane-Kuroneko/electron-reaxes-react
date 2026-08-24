/**
 * AI 列表排序不变量。改 Switch AI 右键拖、Settings 表拖或 reorder-ais 前先跑这些用例。
 *
 * 运行：在 projects/ChatAIO 执行 `yarn test:ai-order`
 */

import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
import {
	applyEnabledAIOrder ,
	canonicalizeAIsForDirtySnapshot ,
	enabledAIIdsEqual ,
	isIdPermutation ,
	mergeEnabledAIOrder ,
	resolveReorderedAIs ,
} from '../src/shared/utils/merge-enabled-ai-order.utility';

type Row = { id : string; disabled? : boolean; label? : string };

const ais = ( ids : string ) : Row[] => {
	return ids.split( ',' ).map( token => {
		const disabled = token.endsWith( '(d)' );
		const id = disabled ? token.slice( 0 , -3 ) : token;
		return {
			id ,
			disabled ,
			label : id,
		};
	} );
};

const idsOf = ( rows : Row[] | null ) => {
	if( !rows ) {
		return null;
	}
	return rows.map( row => row.disabled ? `${ row.id }(d)` : row.id ).join( ',' );
};

describe( 'mergeEnabledAIOrder (Switch AI / enabled-only)' , () => {
	it( 'fills enabled slots and keeps disabled indexes' , () => {
		assert.equal(
			idsOf( mergeEnabledAIOrder( ais( 'A,B(d),C,D' ) , [ 'D' , 'C' , 'A' ] ) ) ,
			'D,B(d),C,A',
		);
	} );

	it( 'rejects missing, extra, duplicate, or disabled ids' , () => {
		const disk = ais( 'A,B(d),C,D' );
		assert.equal( mergeEnabledAIOrder( disk , [ 'D' , 'A' ] ) , null );
		assert.equal( mergeEnabledAIOrder( disk , [ 'D' , 'C' , 'A' , 'B' ] ) , null );
		assert.equal( mergeEnabledAIOrder( disk , [ 'D' , 'C' , 'D' ] ) , null );
		assert.equal( mergeEnabledAIOrder( disk , [ 'A' , 'C' , 'E' ] ) , null );
	} );

	it( 'keeps identity order unchanged' , () => {
		const disk = ais( 'A,B(d),C,D' );
		assert.equal( idsOf( mergeEnabledAIOrder( disk , [ 'A' , 'C' , 'D' ] ) ) , 'A,B(d),C,D' );
	} );
} );

describe( 'resolveReorderedAIs (persist decision)' , () => {
	it( 'permutes the full table when payload includes disabled ids (Settings)' , () => {
		assert.equal(
			idsOf( resolveReorderedAIs( ais( 'A,B(d),C' ) , [ 'C' , 'A' , 'B' ] ) ) ,
			'C,A,B(d)',
		);
	} );

	it( 'slot-merges when payload is enabled-only (Switch AI)' , () => {
		assert.equal(
			idsOf( resolveReorderedAIs( ais( 'A,B(d),C' ) , [ 'C' , 'A' ] ) ) ,
			'C,B(d),A',
		);
	} );

	it( 'matches both paths when every AI is enabled' , () => {
		const disk = ais( 'A,C,D' );
		const next = [ 'D' , 'A' , 'C' ];
		assert.equal( idsOf( resolveReorderedAIs( disk , next ) ) , 'D,A,C' );
		assert.equal( idsOf( mergeEnabledAIOrder( disk , next ) ) , 'D,A,C' );
	} );

	it( 'rejects unknown or partial lists that are not an enabled permutation' , () => {
		assert.equal( resolveReorderedAIs( ais( 'A,B(d),C' ) , [ 'C' ] ) , null );
		assert.equal( resolveReorderedAIs( ais( 'A,B(d),C' ) , [ 'C' , 'A' , 'X' ] ) , null );
		assert.equal( resolveReorderedAIs( ais( 'A,B(d),C' ) , [ 'A' , 'A' , 'C' ] ) , null );
	} );
} );

describe( 'applyEnabledAIOrder (Settings store sync)' , () => {
	it( 'keeps unsaved new rows in their slots while committed ids follow menubar order' , () => {
		const local = [
			...ais( 'A,B(d),C' ) ,
			{ id : 'New' , disabled : false , label : 'draft' },
		];
		const next = applyEnabledAIOrder( local , [ 'C' , 'A' ] );
		assert.equal( idsOf( next ) , 'C,B(d),A,New' );
		assert.equal( next.find( row => row.id === 'New' )?.label , 'draft' );
	} );

	it( 'round-trips a Settings drag that includes a new unsaved row' , () => {
		const disk = ais( 'A,B(d),C' );
		const localAfterDrag = [
			ais( 'C' )[0] ,
			{ id : 'New' , disabled : false } ,
			ais( 'A' )[0] ,
			ais( 'B(d)' )[0] ,
		];
		const persisted = resolveReorderedAIs(
			disk ,
			localAfterDrag.filter( row => row.id !== 'New' ).map( row => row.id ),
		);
		assert.equal( idsOf( persisted ) , 'C,A,B(d)' );
		assert.equal(
			idsOf( applyEnabledAIOrder( localAfterDrag , persisted!.map( row => row.id ) ) ) ,
			'C,New,A,B(d)',
		);
	} );
} );

describe( 'canonicalizeAIsForDirtySnapshot' , () => {
	it( 'makes order-only changes invisible to dirty JSON' , () => {
		const left = canonicalizeAIsForDirtySnapshot( ais( 'C,A,B(d)' ) );
		const right = canonicalizeAIsForDirtySnapshot( ais( 'A,B(d),C' ) );
		assert.equal(
			JSON.stringify( left.map( row => row.id ) ) ,
			JSON.stringify( right.map( row => row.id ) ),
		);
		assert.equal( enabledAIIdsEqual( left.map( row => row.id ) , [ 'A' , 'B' , 'C' ] ) , true );
	} );
} );

describe( 'isIdPermutation' , () => {
	it( 'requires the same set, same length, no dupes' , () => {
		assert.equal( isIdPermutation( [ 'C' , 'A' , 'B' ] , [ 'A' , 'B' , 'C' ] ) , true );
		assert.equal( isIdPermutation( [ 'A' , 'B' ] , [ 'A' , 'B' , 'C' ] ) , false );
		assert.equal( isIdPermutation( [ 'A' , 'A' , 'B' ] , [ 'A' , 'B' , 'C' ] ) , false );
	} );
} );
