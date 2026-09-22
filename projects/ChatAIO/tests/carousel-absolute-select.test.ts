/**
 * 两个 case 按用户看得见的结果判定，不调用产品里的 planCarouselFrame / applyMenuSelect。
 * 那些函数自己保证返回 park/step，实现竞态时单测仍会绿，属于源码顺从。
 * 需求：docs/issues/floating-view-carousel-absolute-select.md
 */

const ring = [ 'a' , 'b' , 'c' , 'd' , 'e' , 'f' ];

const sample = (
	partial : Partial<CarouselSightSample> & Pick<CarouselSightSample , 'visible' | 'centerId' | 'orderIds'> ,
) : CarouselSightSample => {
	return {
		t : partial.t ?? 0 ,
		visible : partial.visible ,
		centerId : partial.centerId ,
		orderIds : partial.orderIds ,
		transitionMs : partial.transitionMs ?? 0 ,
	};
};

describe( '菜单点远处的 AI' , () => {
	it( '轮播不出现，中心是点中的那张，顺序是启用列表' , () => {
		const faults = judgeMenuSelect( [
			sample( { visible : false , centerId : 'a' , orderIds : ring } ) ,
			sample( { visible : false , centerId : 'e' , orderIds : ring } ) ,
		] , 'e' , ring );
		assert.deepEqual( faults , [] );
	} );

	it( '条出现或播了动画，就不算菜单选中' , () => {
		const shown = judgeMenuSelect( [
			sample( { visible : true , centerId : 'e' , orderIds : ring , transitionMs : 300 } ) ,
		] , 'e' , ring );
		assert.ok( shown.includes( 'carousel-shown' ) );
		assert.ok( shown.includes( 'menu-animated' ) );
		assert.ok( shown.includes( 'not-parked-on-selection' ) );
	} );
} );

describe( '菜单点远处之后再顺序下一格' , () => {
	it( '可见时从刚点中的卡滑到相邻下一张，列表始终是启用顺序' , () => {
		const faults = judgeAdjacentStep( [
			sample( { t : 1 , visible : true , centerId : 'e' , orderIds : ring , transitionMs : 300 } ) ,
			sample( { t : 2 , visible : true , centerId : 'f' , orderIds : ring , transitionMs : 300 } ) ,
		] , 'e' , ring , 'next' );
		assert.deepEqual( faults , [] );
		assert.equal( neighborId( 'e' , ring , 'next' ) , 'f' );
	} );

	it( '中途换成更短的列表再跳到目标，不算滑到相邻一张' , () => {
		const faults = judgeAdjacentStep( [
			sample( { visible : false , centerId : 'f' , orderIds : [ 'a' , 'e' , 'f' ] } ) ,
			sample( { visible : true , centerId : 'f' , orderIds : ring , transitionMs : 0 } ) ,
		] , 'e' , ring , 'next' );
		assert.ok( faults.includes( 'list-swapped' ) );
		assert.ok( faults.includes( 'no-slide' ) );
	} );
} );

describe( '顺序切到下一张后再菜单点上一个' , () => {
	it( '顺序步从 a 滑到 b；菜单之后条隐藏并停在 a' , () => {
		const step = judgeAdjacentStep( [
			sample( { visible : true , centerId : 'a' , orderIds : ring , transitionMs : 300 } ) ,
			sample( { visible : true , centerId : 'b' , orderIds : ring , transitionMs : 300 } ) ,
		] , 'a' , ring , 'next' );
		const menu = judgeMenuSelect( [
			sample( { visible : false , centerId : 'b' , orderIds : ring } ) ,
			sample( { visible : false , centerId : 'a' , orderIds : ring } ) ,
		] , 'a' , ring );
		assert.deepEqual( step , [] );
		assert.deepEqual( menu , [] );
	} );

	it( '菜单把轮播叫出来，就是跳出而不是停靠' , () => {
		const faults = judgeMenuSelect( [
			sample( { visible : true , centerId : 'a' , orderIds : ring , transitionMs : 0 } ) ,
		] , 'a' , ring );
		assert.ok( faults.includes( 'carousel-shown' ) );
	} );

	it( '上一步留下的可见条被收起，且没有在可见时跳到目标，不算跳出' , () => {
		const faults = judgeMenuSelect( [
			sample( { visible : true , centerId : 'b' , orderIds : ring } ) ,
			sample( { visible : false , centerId : 'a' , orderIds : ring } ) ,
		] , 'a' , ring );
		assert.deepEqual( faults , [] );
	} );

	it( '收起前在可见状态下跳到目标，算跳出' , () => {
		const faults = judgeMenuSelect( [
			sample( { visible : true , centerId : 'b' , orderIds : ring , transitionMs : 300 } ) ,
			sample( { visible : true , centerId : 'a' , orderIds : ring , transitionMs : 300 } ) ,
			sample( { visible : false , centerId : 'a' , orderIds : ring } ) ,
		] , 'a' , ring );
		assert.ok( faults.includes( 'carousel-shown' ) );
		assert.ok( faults.includes( 'menu-animated' ) );
	} );
} );

import {
	judgeAdjacentStep ,
	judgeMenuSelect ,
	neighborId ,
	type CarouselSightSample ,
} from '#shared/carousel-requirement.utility';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
