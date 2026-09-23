/**
 * 轮播两个 case 的端到端判定看用户看得见的采样，不看日志里的 park/step/faults。
 * 采样：条是否可见、中心卡 id、启用顺序、transitionDuration。
 * 内部轨迹只作附件。需求：docs/issues/floating-view-carousel-absolute-select.md
 */

const testCarousel = test.extend( {
	userAisPatch : async( {} , use ) => {
		await use( patchCarouselRing );
	},
} );

const RING = [ ...E2E_CAROUSEL_IDS ];

const collectSight = async(
	floating : Page ,
	since : number ,
	settle : ( samples:CarouselSightSample[] ) => boolean ,
) => {
	const started = Date.now();
	let samples : CarouselSightSample[] = [];
	let stableSince = 0;
	let signature = '';
	while( Date.now() - started < 8_000 ) {
		samples = await readCarouselSight( floating , since );
		const last = samples[samples.length - 1];
		const nextSignature = last
			? `${ last.visible }|${ last.centerId }|${ last.orderIds.join( ',' ) }|${ last.transitionMs }`
			: '';
		if( nextSignature !== signature ) {
			signature = nextSignature;
			stableSince = Date.now();
		}
		if( settle( samples ) && Date.now() - stableSince >= 350 ) {
			return samples;
		}
		await floating.waitForTimeout( 40 );
	}
	return samples;
};

testCarousel( 'menu select of a distant AI parks hidden, then Next AI Page steps once to the neighbor' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await waitForMainRuntime( electronApp );
	const floating = await waitForWindowByUrl( electronApp , 'FloatingView' );
	await armCarouselSight( floating );
	const start = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_A.id && state.enabledAIIds.length === RING.length ,
	);
	expect( start.enabledAIIds ).toEqual( RING );

	const sinceMenu = await markCarouselSight( floating );
	await switchToAiById( electronApp , mainWindow , E2E_AI_E.id );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_E.id ,
	);
	const menuSamples = await collectSight( floating , sinceMenu , ( samples ) => {
		return judgeMenuSelect( samples , E2E_AI_E.id , RING ).length === 0
			|| samples.some( ( sample ) => sample.centerId === E2E_AI_E.id );
	} );
	expect( judgeMenuSelect( menuSamples , E2E_AI_E.id , RING ) , summarizeCarouselSight( menuSamples ) ).toEqual( [] );

	const sinceStep = await markCarouselSight( floating );
	await clickNextAiPage( electronApp , mainWindow );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_F.id ,
	);
	const stepSamples = await collectSight( floating , sinceStep , ( samples ) => {
		const faults = judgeVisibleScroll( samples , E2E_AI_E.id , RING , 'next' );
		return faults.length === 0 || samples.some( ( sample ) => sample.opacity >= 0.9 && sample.highlightedId === E2E_AI_F.id );
	} );
	expect( judgeVisibleScroll( stepSamples , E2E_AI_E.id , RING , 'next' ) , summarizeCarouselSight( stepSamples ) ).toEqual( [] );
	const trace = await readCarouselTrace( floating );
	await test.info().attach( 'carousel-after-menu-step' , {
		body : JSON.stringify( trace , null , 2 ) ,
		contentType : 'application/json' ,
	} );
} );

testCarousel( 'badge select of a neighbor then Next scrolls instead of popping the cards in' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await waitForMainRuntime( electronApp );
	const floating = await waitForWindowByUrl( electronApp , 'FloatingView' );
	await armCarouselSight( floating );
	const start = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === E2E_AI_A.id && state.enabledAIIds.length === RING.length ,
	);
	expect( start.enabledAIIds ).toEqual( RING );

	const dropdown = await openCurrentAiMenu( electronApp , mainWindow );
	const menuIds = await readSwitchAiItemIds( dropdown );
	const currentIndex = menuIds.indexOf( E2E_AI_A.id );
	const neighborId = menuIds[currentIndex + 1];
	expect( neighborId ).toBe( E2E_AI_B.id );
	await clickClosingDropdownItem(
		electronApp ,
		dropdown.locator( `[data-item-payload="${ neighborId }"]` ),
	);
	const parked = await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === neighborId && state.instantiatedAIIds.includes( neighborId ) ,
	);
	const opened = parked.instantiatedAIIds;
	const nextOpened = opened[( opened.indexOf( neighborId ) + 1 ) % opened.length];
	expect( nextOpened ).toBeTruthy();

	const sinceNext = await markCarouselSight( floating );
	await watchClick( mainWindow.locator( '[data-menu-id="next-instantiated"] button' ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.currentAIViewKey === nextOpened ,
	);
	const stepSamples = await collectSight( floating , sinceNext , ( samples ) => {
		const faults = judgeVisibleScroll( samples , neighborId , opened , 'next' );
		return faults.length === 0
			|| samples.some( ( sample ) => sample.opacity >= 0.9 && sample.highlightedId === nextOpened );
	} );
	expect( judgeVisibleScroll( stepSamples , neighborId , opened , 'next' ) , summarizeCarouselSight( stepSamples ) ).toEqual( [] );
} );

import { test , expect } from '../fixtures';
import { clickClosingDropdownItem , waitForE2ESnapshot , waitForMainRuntime , waitForWindowByUrl } from '../support/app-probe';
import { clickNextAiPage , openCurrentAiMenu , readSwitchAiItemIds , switchToAiById } from '../support/switch-ai';
import { watchClick } from '../support/observe';
import {
	armCarouselSight ,
	markCarouselSight ,
	readCarouselSight ,
	readCarouselTrace ,
} from '../support/carousel';
import {
	E2E_AI_A ,
	E2E_AI_B ,
	E2E_AI_E ,
	E2E_AI_F ,
	E2E_CAROUSEL_IDS ,
	patchCarouselRing ,
} from '../support/e2e-ais';
import {
	judgeMenuSelect ,
	judgeVisibleScroll ,
	summarizeCarouselSight ,
	type CarouselSightSample ,
} from '../../src/shared/carousel-requirement.utility';
import type { Page } from '@playwright/test';
