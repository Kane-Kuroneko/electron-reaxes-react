/**
 * FloatingView 轮播轨迹。渲染进程把每次命令 / 动画帧 / DOM 卡片序放进
 * window.__CHATAIO_CAROUSEL_TRACE__，平时同一条也写入 carousel-ops.jsonl。
 * 设计：docs/issues/floating-view-carousel-absolute-select.md
 */

export const armCarouselSight = async( floating:Page ) => {
	await floating.evaluate( () => {
		const host = globalThis as typeof globalThis & {
			__carouselSight? : Array<{
				t : number;
				visible : boolean;
				centerId : string;
				orderIds : string[];
				transitionMs : number;
			}>;
			__carouselSightTimer? : number;
		};
		if( host.__carouselSightTimer ) {
			window.clearInterval( host.__carouselSightTimer );
		}
		const samples : Array<{
			t : number;
			visible : boolean;
			centerId : string;
			orderIds : string[];
			transitionMs : number;
		}> = [];
		const read = () => {
			const bar = document.querySelector( '.switch-ai-bar' );
			const wrapper = document.querySelector( '.swiper-wrapper' ) as HTMLElement | null;
			const duration = wrapper?.style?.transitionDuration || '';
			let transitionMs = 0;
			if( duration.endsWith( 'ms' ) ) {
				transitionMs = Number.parseFloat( duration ) || 0;
			} else if( duration.endsWith( 's' ) ) {
				transitionMs = ( Number.parseFloat( duration ) || 0 ) * 1000;
			}
			const slides = Array.from( document.querySelectorAll( '.switch-ai-bar .swiper-slide' ) ).map( ( node ) => {
				const slide = node as HTMLElement;
				const card = slide.querySelector( '.switch-ai-bar__item' );
				const sourceRaw = card?.getAttribute( 'data-source-index' ) || '';
				return {
					aiId : card?.getAttribute( 'data-ai-id' ) || '' ,
					position : slide.getAttribute( 'data-position' ) || '' ,
					duplicate : slide.classList.contains( 'swiper-slide-duplicate' ) ,
					key : card?.getAttribute( 'data-carousel-key' ) || '' ,
					sourceIndex : sourceRaw === '' ? Number.NaN : Number( sourceRaw ) ,
				};
			} );
			const orderIds = slides
				.filter( ( slide ) => slide.duplicate !== true && slide.key.endsWith( '--dup0' ) && Number.isFinite( slide.sourceIndex ) )
				.sort( ( left , right ) => left.sourceIndex - right.sourceIndex )
				.map( ( slide ) => slide.aiId );
			const barRect = bar?.getBoundingClientRect();
			const midpoint = barRect ? barRect.left + barRect.width / 2 : 0;
			let visualId = '';
			let visualDistance = Number.POSITIVE_INFINITY;
			for( const node of Array.from( document.querySelectorAll( '.switch-ai-bar .swiper-slide' ) ) ) {
				const slide = node as HTMLElement;
				const card = slide.querySelector( '.switch-ai-bar__item' );
				const aiId = card?.getAttribute( 'data-ai-id' ) || '';
				const rect = slide.getBoundingClientRect();
				if( !aiId || rect.width < 1 ) {
					continue;
				}
				const distance = Math.abs( rect.left + rect.width / 2 - midpoint );
				if( distance < visualDistance ) {
					visualDistance = distance;
					visualId = aiId;
				}
			}
			const marked = slides.find( ( slide ) => slide.position === 'current' && slide.duplicate !== true && slide.aiId )
				|| slides.find( ( slide ) => slide.position === 'current' && slide.aiId );
			samples.push( {
				t : performance.now() ,
				visible : bar?.classList.contains( 'switch-ai-bar--visible' ) === true ,
				centerId : visualId || marked?.aiId || '' ,
				orderIds ,
				transitionMs ,
			} );
			if( samples.length > 500 ) {
				samples.splice( 0 , samples.length - 500 );
			}
		};
		host.__carouselSight = samples;
		read();
		host.__carouselSightTimer = window.setInterval( read , 16 );
	} );
};

export const markCarouselSight = async( floating:Page ) => {
	return floating.evaluate( () => performance.now() );
};

export const readCarouselSight = async( floating:Page , since:number ) => {
	return floating.evaluate( ( mark ) => {
		const host = globalThis as typeof globalThis & {
			__carouselSight? : Array<{
				t : number;
				visible : boolean;
				centerId : string;
				orderIds : string[];
				transitionMs : number;
			}>;
		};
		return ( host.__carouselSight || [] ).filter( ( sample ) => sample.t >= mark );
	} , since );
};

export const markCarouselTrace = async( floating:Page ) => {
	return floating.evaluate( () => Date.now() );
};

export const readCarouselTrace = async( floating:Page ) => {
	return floating.evaluate( () => {
		const host = globalThis as typeof globalThis & {
			__CHATAIO_CAROUSEL_TRACE__? : CarouselTraceEntry[];
		};
		return host.__CHATAIO_CAROUSEL_TRACE__ || [];
	} );
};

export const waitForCarouselEntry = async(
	floating : Page ,
	since : number ,
	predicate : ( entry:CarouselTraceEntry ) => boolean ,
	timeoutMs = 15_000 ,
) => {
	const started = Date.now();
	let recent : CarouselTraceEntry[] = [];
	while( Date.now() - started < timeoutMs ) {
		const entries = await readCarouselTrace( floating );
		recent = entries.filter( ( entry ) => ( entry.ts || 0 ) >= since );
		const hit = [ ...recent ].reverse().find( predicate );
		if( hit ) {
			return {
				hit ,
				recent ,
			};
		}
		await floating.waitForTimeout( 50 );
	}
	throw new Error( `carousel trace timeout\n${ summarizeCarouselTrace( recent ) }` );
};

export const summarizeCarouselTrace = ( entries : readonly CarouselTraceEntry[] ) => {
	return entries.map( ( entry ) => {
		const faults = ( entry.faults || [] ).join( '|' ) || '-';
		const name = entry.gesture || entry.command || entry.reason || '';
		return `${ entry.kind || '?' } ${ name } idx=${ entry.activeIndex ?? '-' } anim=${ entry.animation || '-' } steps=${ entry.steps ?? '-' } ${ entry.fromIndex ?? '-' }→${ entry.toIndex ?? '-' } vis=${ entry.visible ?? '-' } ids=${ ( entry.itemIds || [] ).length } faults=${ faults }`;
	} ).join( '\n' );
};

export const carouselCycleIds = ( entry:CarouselTraceEntry ) => {
	return ( entry.slides || [] )
		.filter( ( slide ) => slide.duplicate !== true && slide.key.endsWith( '--dup0' ) )
		.slice()
		.sort( ( left , right ) => ( left.sourceIndex ?? 0 ) - ( right.sourceIndex ?? 0 ) )
		.map( ( slide ) => slide.aiId );
};

export type CarouselTraceEntry = {
	ts? : number;
	kind? : string;
	command? : string;
	gesture? : string;
	reason? : string;
	visible? : boolean;
	activeIndex? : number;
	animation? : string;
	steps? : number;
	fromIndex? : number;
	toIndex? : number;
	ringDistance? : number;
	speed? : number;
	itemIds? : string[];
	faults? : string[];
	expectedCenterId? : string;
	slides? : Array<{
		aiId : string;
		label : string;
		position : string;
		duplicate : boolean;
		empty : boolean;
		key : string;
		sourceIndex : number | null;
	}>;
};

import type { Page } from '@playwright/test';
