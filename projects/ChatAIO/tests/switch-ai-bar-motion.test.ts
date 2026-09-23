/**
 * 轮播呈现：菜单绝对选中只停靠，顺序切换才是一步。
 * 契约见 docs/issues/floating-view-carousel-absolute-select.md。
 */

const ids = ( spec:string ) => spec.split( ',' );

/** 修之前可见时按 direction 把环路距离一次滑完。菜单不该走这条。 */
const legacyVisibleSteps = (
	visual:number ,
	target:number ,
	total:number ,
	direction:'next' | 'previous' ,
) => {
	if( direction === 'next' ) {
		return ( target - visual + total ) % total;
	}
	return ( visual - target + total ) % total;
};

describe( 'presentCarousel' , () => {
	const list = ids( 'a,b,c,d,e,f' );

	it( '菜单点很远的 AI：隐藏停靠，不产生连滑。之后顺序 next 才是一步' , () => {
		assert.equal( legacyVisibleSteps( 0 , 5 , list.length , 'next' ) , 5 );

		assert.equal( presentCarousel( {
			visible : false ,
			parkedIndex : 0 ,
			parkedIds : list ,
			targetIndex : 4 ,
			targetIds : list ,
		} ) , 'park' );

		assert.equal( presentCarousel( {
			visible : true ,
			parkedIndex : 4 ,
			parkedIds : list ,
			targetIndex : 5 ,
			targetIds : list ,
		} ) , 'step' );
	} );

	it( '菜单点上一个：仍然只停靠，不在可见层上滚，也不跳' , () => {
		assert.equal( legacyVisibleSteps( 3 , 2 , list.length , 'next' ) , 5 );
		assert.equal( presentCarousel( {
			visible : false ,
			parkedIndex : 3 ,
			parkedIds : list ,
			targetIndex : 2 ,
			targetIds : list ,
		} ) , 'park' );
	} );

	it( '已经停在目标上时不再动 Swiper' , () => {
		assert.equal( presentCarousel( {
			visible : false ,
			parkedIndex : 2 ,
			parkedIds : list ,
			targetIndex : 2 ,
			targetIds : list ,
		} ) , 'idle' );
		assert.equal( presentCarousel( {
			visible : true ,
			parkedIndex : 2 ,
			parkedIds : list ,
			targetIndex : 2 ,
			targetIds : list ,
		} ) , 'idle' );
	} );

	it( '顺序切换在可见时标记为 step，步数由组件固定为 1，不读取环路距离' , () => {
		assert.equal( presentCarousel( {
			visible : true ,
			parkedIndex : 0 ,
			parkedIds : list ,
			targetIndex : 1 ,
			targetIds : list ,
		} ) , 'step' );
		assert.equal( presentCarousel( {
			visible : true ,
			parkedIndex : 1 ,
			parkedIds : list ,
			targetIndex : 0 ,
			targetIds : list ,
		} ) , 'step' );
	} );
} );

import { presentCarousel } from '#shared/switch-ai-bar-motion.utility';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
