/**
 * FloatingView 正式包轨迹 / 性能埋点契约。
 * 设计：docs/features/floating-view-perf-monitor.md
 */

describe( 'floating-view-perf' , () => {
	beforeEach( () => {
		resetFloatingViewPerfForTests();
		perf.drain();
	} );

	it( 'next/prev 映射到轨迹 trigger' , () => {
		assert.equal( fvTriggerFromStep( 'next' , 'configured' ) , 'next' );
		assert.equal( fvTriggerFromStep( 'previous' , 'configured' ) , 'prev' );
		assert.equal( fvTriggerFromStep( 'next' , 'instantiated' ) , 'next-opened' );
		assert.equal( fvTriggerFromStep( 'previous' , 'instantiated' ) , 'prev-opened' );
	} );

	it( 'begin 写出 trigger 且 seq 递增，并带 intervalMs' , () => {
		const first = beginFloatingViewGesture( 'main' , {
			trigger : 'menu-select' ,
			fromAiId : 'a' ,
			toAiId : 'b' ,
			fromIndex : 0 ,
			toIndex : 3 ,
			itemCount : 6 ,
			listSource : 'instantiated' ,
			overlayIntent : 'hide' ,
		} );
		const second = beginFloatingViewGesture( 'main' , {
			trigger : 'next' ,
			fromAiId : 'b' ,
			toAiId : 'c' ,
			fromIndex : 3 ,
			toIndex : 4 ,
			itemCount : 6 ,
			listSource : 'configured' ,
			overlayIntent : 'show' ,
		} );
		assert.equal( first.seq , 1 );
		assert.equal( second.seq , 2 );
		assert.equal( first.trigger , 'menu-select' );
		assert.equal( second.trigger , 'next' );
		const events = perf.drain();
		const triggers = events.filter( event => event.phase === FvPerfPhase.Trigger );
		assert.equal( triggers.length , 2 );
		assert.equal( triggers[0].data?.trigger , 'menu-select' );
		assert.equal( triggers[0].data?.fromAiId , 'a' );
		assert.equal( triggers[0].data?.toAiId , 'b' );
		assert.equal( triggers[0].data?.overlayIntent , 'hide' );
		assert.equal( triggers[1].data?.trigger , 'next' );
		assert.equal( typeof triggers[1].data?.intervalMs , 'number' );
	} );

	it( 'complete 同一 ctx 只写一次' , () => {
		const gesture = beginFloatingViewGesture( 'main' , {
			trigger : 'prev' ,
			fromAiId : 'c' ,
			toAiId : 'b' ,
			fromIndex : 2 ,
			toIndex : 1 ,
			itemCount : 4 ,
			listSource : 'configured' ,
		} );
		perf.drain();
		completeFloatingViewGesture( 'main' , gesture.ctxId , { reason : 'first' } );
		completeFloatingViewGesture( 'main' , gesture.ctxId , { reason : 'second' } );
		const events = perf.drain();
		const completes = events.filter( event => event.phase === FvPerfPhase.Complete );
		assert.equal( completes.length , 1 );
		assert.equal( completes[0].data?.reason , 'first' );
		assert.equal( completes[0].data?.trigger , 'prev' );
	} );

	it( 'skipped 也算一条轨迹' , () => {
		skipFloatingViewGesture( 'main' , 'duplicate-40ms' , {
			trigger : 'next' ,
			direction : 'next' ,
		} );
		const events = perf.drain();
		assert.equal( events.length , 1 );
		assert.equal( events[0].phase , FvPerfPhase.Skipped );
		assert.equal( events[0].data?.reason , 'duplicate-40ms' );
		assert.equal( events[0].data?.trigger , 'next' );
	} );

	it( 'phase 前缀可识别' , () => {
		assert.equal( isFvPerfPhase( FvPerfPhase.Trigger ) , true );
		assert.equal( isFvPerfPhase( 'switch:start' ) , false );
	} );
} );

import {
	beginFloatingViewGesture ,
	completeFloatingViewGesture ,
	FvPerfPhase ,
	fvTriggerFromStep ,
	isFvPerfPhase ,
	resetFloatingViewPerfForTests ,
	skipFloatingViewGesture ,
} from '#shared/utils/floating-view-perf.utility';
import { perf } from '#shared/utils/switch-perf-recorder.utility';
import assert from 'node:assert/strict';
import { beforeEach , describe , it } from 'node:test';
