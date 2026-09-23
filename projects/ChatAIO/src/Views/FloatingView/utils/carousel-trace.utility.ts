/**
 * 渲染进程轮播轨迹：平时每次菜单选中 / 顺序切换都记命令、动画帧和 DOM 卡片序。
 * 内存环给 E2E 读；同一条记录经 perf 写入 performance-logs/carousel-ops.jsonl。
 * 设计：docs/issues/floating-view-carousel-absolute-select.md
 */

const TRACE_LIMIT = 120;

export const readCarouselDomSnapshot = () : CarouselDomSnapshot | null => {
	if( typeof document === 'undefined' ) {
		return null;
	}
	const bar = document.querySelector( '.switch-ai-bar' );
	const wrapper = document.querySelector( '.swiper-wrapper' );
	const slides = Array.from( document.querySelectorAll( '.switch-ai-bar .swiper-slide' ) ).map( ( node ) => {
		const slide = node as HTMLElement;
		const card = slide.querySelector( '.switch-ai-bar__item' );
		const label = ( slide.querySelector( '.switch-ai-bar__label' )?.textContent || '' ).trim();
		const aiId = card?.getAttribute( 'data-ai-id' ) || '';
		const key = card?.getAttribute( 'data-carousel-key' ) || '';
		const sourceRaw = card?.getAttribute( 'data-source-index' );
		const sourceIndex = sourceRaw == null || sourceRaw === '' ? null : Number( sourceRaw );
		return {
			aiId ,
			label ,
			position : slide.getAttribute( 'data-position' ) || '' ,
			duplicate : slide.classList.contains( 'swiper-slide-duplicate' ) ,
			key ,
			sourceIndex : sourceIndex != null && Number.isFinite( sourceIndex ) ? sourceIndex : null ,
			empty : aiId.length === 0 || label.length === 0 ,
		};
	} );
	return {
		barClass : bar?.className || '' ,
		visible : bar?.classList.contains( 'switch-ai-bar--visible' ) === true ,
		transform : ( wrapper as HTMLElement | null )?.style?.transform || '' ,
		transitionDuration : ( wrapper as HTMLElement | null )?.style?.transitionDuration || '' ,
		slides ,
	};
};

export const traceCarouselOp = ( entry : Record<string , unknown> & { ctxId? : string } ) => {
	const stamped = emitCarouselOp( 'renderer' , entry );
	const host = globalThis as typeof globalThis & {
		__CHATAIO_CAROUSEL_TRACE__? : Array<Record<string , unknown>>;
	};
	const list = host.__CHATAIO_CAROUSEL_TRACE__ ?? [];
	list.push( stamped );
	if( list.length > TRACE_LIMIT ) {
		list.splice( 0 , list.length - TRACE_LIMIT );
	}
	host.__CHATAIO_CAROUSEL_TRACE__ = list;
	return stamped;
};

export const traceCarouselDom = ( input : {
	ctxId : string;
	reason : string;
	gesture : CarouselGesture;
	activeIndex : number;
	direction : 'next' | 'previous';
	itemIds : string[];
	itemLabels : string[];
	expectedCenterId : string;
	animation : CarouselAnimation;
	steps : number;
	ringDistance : number;
} ) => {
	const dom = readCarouselDomSnapshot();
	if( !dom ) {
		return null;
	}
	const faults = detectCarouselOpFaults( {
		gesture : input.gesture ,
		visible : dom.visible ,
		animation : input.animation ,
		steps : input.steps ,
		direction : input.direction ,
		ringDistance : input.ringDistance ,
		itemIds : input.itemIds ,
		expectedCenterId : input.expectedCenterId ,
		slides : dom.slides ,
	} );
	return traceCarouselOp( {
		kind : 'dom' ,
		reason : input.reason ,
		ctxId : input.ctxId ,
		gesture : input.gesture ,
		activeIndex : input.activeIndex ,
		direction : input.direction ,
		visible : dom.visible ,
		animation : input.animation ,
		steps : input.steps ,
		ringDistance : input.ringDistance ,
		itemIds : input.itemIds ,
		itemLabels : input.itemLabels ,
		expectedCenterId : input.expectedCenterId ,
		barClass : dom.barClass ,
		transform : dom.transform ,
		transitionDuration : dom.transitionDuration ,
		slides : dom.slides ,
		faults ,
	} );
};

type CarouselDomSnapshot = {
	barClass : string;
	visible : boolean;
	transform : string;
	transitionDuration : string;
	slides : CarouselDomSlide[];
};

import {
	detectCarouselOpFaults ,
	emitCarouselOp ,
	type CarouselAnimation ,
	type CarouselDomSlide ,
	type CarouselGesture ,
} from '#shared/carousel-op.utility';
