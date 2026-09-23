/**
 * 轮播操作契约：卡片渲染序、停靠 / 一格动画、以及可落盘的操作记录。
 * 菜单绝对选中不弹出；顺序切换只滑相邻一格。
 * 设计：docs/issues/floating-view-carousel-absolute-select.md
 */

export const CAROUSEL_OP_PHASE = 'carousel:op';

export type CarouselGesture = 'menu-select' | 'park' | 'step' | 'close' | 'idle';

export type CarouselAnimation = 'none' | 'slideNext' | 'slidePrev' | 'aborted';

export type CarouselItem = {
	id : string;
	label : string;
};

export type CarouselCursor = {
	index : number;
	ids : string[];
	epoch : number;
};

export type CarouselDisplaySlide<T> = T & {
	_key : string;
	sourceIndex : number;
	duplicate : number;
};

export type CarouselDomSlide = {
	aiId : string;
	label : string;
	position : string;
	duplicate : boolean;
	key : string;
	sourceIndex : number | null;
	empty : boolean;
};

export type CarouselFramePlan = {
	presentation : CarouselPresentation;
	animation : 'none' | 'slideNext' | 'slidePrev';
	steps : 0 | 1;
	remount : boolean;
	fromIndex : number;
	toIndex : number;
	ringDistance : number;
	nextCursor : CarouselCursor;
};

export type CarouselSession = {
	visible : boolean;
	items : CarouselItem[];
	activeIndex : number;
	direction : 'next' | 'previous';
	cursor : CarouselCursor;
};

export type CarouselOpRecord = {
	gesture : CarouselGesture;
	presentation : CarouselPresentation;
	animation : CarouselAnimation;
	steps : number;
	visible : boolean;
	direction : 'next' | 'previous';
	fromIndex : number;
	toIndex : number;
	ringDistance : number;
	activeIndex : number;
	itemIds : string[];
	itemLabels : string[];
	displayIds : string[];
	displayKeys : string[];
	centerId : string;
	faults : string[];
};

/**
 * @description 沿 direction 从 from 走到 to 要经过的格数。距离不是动画步数。
 */
export const ringSteps = (
	from : number ,
	to : number ,
	total : number ,
	direction : 'next' | 'previous' ,
) => {
	if( total <= 1 ) {
		return 0;
	}
	if( direction === 'next' ) {
		return ( to - from + total ) % total;
	}
	return ( from - to + total ) % total;
};

/**
 * @description loop + centeredSlides 需要的重复份数。第一份（dup0）顺序等于 items。
 * initialSlide 必须落在第一份，避免中心卡是没有 React 内容的克隆。
 */
export const buildCarouselDisplayItems = <T extends { id : string }>( items : readonly T[] ) => {
	const total = items.length;
	const slidesPerView = total >= 4 ? 5 : total === 1 ? 1 : total === 0 ? 0 : 3;
	const displayItems : CarouselDisplaySlide<T>[] = [];
	if( total > 0 ) {
		const minSlidesForLoop = slidesPerView + Math.ceil( slidesPerView / 2 ) * 2;
		const repeatTimes = Math.max( 1 , Math.ceil( minSlidesForLoop / total ) );
		for( let duplicate = 0 ; duplicate < repeatTimes ; duplicate++ ) {
			for( let sourceIndex = 0 ; sourceIndex < total ; sourceIndex++ ) {
				const item = items[sourceIndex];
				displayItems.push( {
					...item ,
					_key : `${ item.id }--dup${ duplicate }` ,
					sourceIndex ,
					duplicate ,
				} );
			}
		}
	}
	return {
		slidesPerView ,
		displayItems ,
	};
};

/**
 * @description 非 Swiper 克隆、且属于第一份拷贝的 id，按 sourceIndex 排回用户顺序。
 */
export const firstCycleIds = ( slides : readonly CarouselDomSlide[] ) => {
	return slides
		.filter( ( slide ) => slide.duplicate !== true && slide.key.endsWith( '--dup0' ) )
		.slice()
		.sort( ( left , right ) => {
			return ( left.sourceIndex ?? 0 ) - ( right.sourceIndex ?? 0 );
		} )
		.map( ( slide ) => slide.aiId );
};

/**
 * @description 这次 store 更新对应的 Swiper 动作。隐藏时只换 key；可见时只允许一格。
 */
export const planCarouselFrame = ( input : {
	visible : boolean;
	cursor : { index : number; ids : readonly string[]; epoch : number };
	targetIndex : number;
	targetIds : readonly string[];
	direction : 'next' | 'previous';
} ) : CarouselFramePlan => {
	const presentation = presentCarousel( {
		visible : input.visible ,
		parkedIndex : input.cursor.index ,
		parkedIds : input.cursor.ids ,
		targetIndex : input.targetIndex ,
		targetIds : input.targetIds ,
	} );
	const ringDistance = ringSteps(
		input.cursor.index ,
		input.targetIndex ,
		input.targetIds.length ,
		input.direction ,
	);
	if( presentation === 'park' ) {
		return {
			presentation ,
			animation : 'none' ,
			steps : 0 ,
			remount : true ,
			fromIndex : input.cursor.index ,
			toIndex : input.targetIndex ,
			ringDistance ,
			nextCursor : {
				index : input.targetIndex ,
				ids : input.targetIds.slice() ,
				epoch : input.cursor.epoch + 1 ,
			} ,
		};
	}
	if( presentation === 'step' ) {
		return {
			presentation ,
			animation : input.direction === 'next' ? 'slideNext' : 'slidePrev' ,
			steps : 1 ,
			remount : false ,
			fromIndex : input.cursor.index ,
			toIndex : input.targetIndex ,
			ringDistance ,
			nextCursor : {
				index : input.targetIndex ,
				ids : input.targetIds.slice() ,
				epoch : input.cursor.epoch ,
			} ,
		};
	}
	return {
		presentation : 'idle' ,
		animation : 'none' ,
		steps : 0 ,
		remount : false ,
		fromIndex : input.cursor.index ,
		toIndex : input.targetIndex ,
		ringDistance ,
		nextCursor : {
			index : input.cursor.index ,
			ids : input.cursor.ids.slice() ,
			epoch : input.cursor.epoch ,
		} ,
	};
};

/**
 * @description 给日志和测试用的故障码。不抛错，调用方决定是否当失败。
 */
export const detectCarouselOpFaults = ( input : {
	gesture : CarouselGesture;
	visible : boolean;
	animation : CarouselAnimation;
	steps : number;
	direction : 'next' | 'previous';
	ringDistance : number;
	itemIds : readonly string[];
	expectedCenterId : string;
	slides? : readonly CarouselDomSlide[] | null;
} ) => {
	const faults : string[] = [];
	if( input.gesture === 'menu-select' || input.gesture === 'park' ) {
		if( input.visible === true ) {
			faults.push( 'menu-or-park-visible' );
		}
		if( input.animation !== 'none' ) {
			faults.push( 'park-animated' );
		}
		if( input.steps !== 0 ) {
			faults.push( 'park-steps' );
		}
	}
	if( input.gesture === 'step' ) {
		if( input.visible !== true ) {
			faults.push( 'step-hidden' );
		}
		const expectedAnimation = input.direction === 'next' ? 'slideNext' : 'slidePrev';
		if( input.animation === 'aborted' ) {
			faults.push( 'step-aborted' );
		} else if( input.animation !== expectedAnimation ) {
			faults.push( 'step-direction' );
		}
		if( input.steps !== 1 ) {
			faults.push( 'step-count' );
		}
		if( input.itemIds.length > 1 && input.ringDistance !== 1 ) {
			faults.push( 'step-not-adjacent' );
		}
	}
	if( input.slides ) {
		if( input.slides.length === 0 && input.itemIds.length > 0 ) {
			faults.push( 'dom-empty' );
		} else if( input.slides.length > 0 ) {
			const cycle = firstCycleIds( input.slides );
			if( cycle.join( '|' ) !== input.itemIds.join( '|' ) ) {
				faults.push( 'render-order' );
			}
			const currents = input.slides.filter( ( slide ) => slide.position === 'current' );
			if( currents.length === 0 ) {
				faults.push( 'no-current-card' );
			}
			if( currents.some( ( slide ) => slide.empty ) ) {
				faults.push( 'current-card-empty' );
			}
			if( currents.length > 0 && currents.every( ( slide ) => slide.duplicate ) ) {
				const readable = currents.filter( ( slide ) => {
					return slide.empty !== true && slide.aiId === input.expectedCenterId;
				} );
				if( readable.length === 0 ) {
					faults.push( 'current-only-duplicate' );
				}
			}
			const filled = currents.filter( ( slide ) => slide.empty !== true && slide.duplicate !== true );
			if( filled.some( ( slide ) => slide.aiId !== input.expectedCenterId ) ) {
				faults.push( 'current-card-mismatch' );
			}
		}
	}
	return faults;
};

export const createCarouselSession = ( items : readonly CarouselItem[] , index = 0 ) : CarouselSession => {
	const ids = items.map( ( item ) => item.id );
	const activeIndex = index >= 0 && index < items.length ? index : 0;
	return {
		visible : false ,
		items : items.map( ( item ) => ( { id : item.id , label : item.label } ) ) ,
		activeIndex ,
		direction : 'next' ,
		cursor : {
			index : activeIndex ,
			ids ,
			epoch : 0 ,
		} ,
	};
};

const recordFromPlan = (
	session : CarouselSession ,
	gesture : CarouselGesture ,
	visible : boolean ,
	direction : 'next' | 'previous' ,
	toIndex : number ,
	plan : CarouselFramePlan ,
	animation : CarouselAnimation ,
) : CarouselOpRecord => {
	const built = buildCarouselDisplayItems( session.items );
	const centerId = session.items[toIndex]?.id || '';
	const itemIds = session.items.map( ( item ) => item.id );
	return {
		gesture ,
		presentation : plan.presentation ,
		animation ,
		steps : animation === 'aborted' ? 0 : plan.steps ,
		visible ,
		direction ,
		fromIndex : plan.fromIndex ,
		toIndex ,
		ringDistance : plan.ringDistance ,
		activeIndex : toIndex ,
		itemIds ,
		itemLabels : session.items.map( ( item ) => item.label ) ,
		displayIds : built.displayItems.map( ( item ) => item.id ) ,
		displayKeys : built.displayItems.map( ( item ) => item._key ) ,
		centerId ,
		faults : detectCarouselOpFaults( {
			gesture ,
			visible ,
			animation ,
			steps : animation === 'aborted' ? 0 : plan.steps ,
			direction ,
			ringDistance : plan.ringDistance ,
			itemIds ,
			expectedCenterId : centerId ,
		} ) ,
	};
};

/**
 * @description 菜单点名：隐藏，停到 configured 下标，不调用 slideNext / slidePrev。
 */
export const applyMenuSelect = ( session : CarouselSession , index : number ) => {
	const plan = planCarouselFrame( {
		visible : false ,
		cursor : session.cursor ,
		targetIndex : index ,
		targetIds : session.items.map( ( item ) => item.id ) ,
		direction : 'next' ,
	} );
	const next : CarouselSession = {
		...session ,
		visible : false ,
		activeIndex : index ,
		direction : 'next' ,
		cursor : plan.presentation === 'idle' ? session.cursor : plan.nextCursor ,
	};
	return {
		session : next ,
		record : recordFromPlan( session , 'menu-select' , false , 'next' , index , plan , plan.animation ) ,
	};
};

/**
 * @description 顺序一格：可见，并且只沿 direction 走相邻一张。
 */
export const applySequentialStep = (
	session : CarouselSession ,
	direction : 'next' | 'previous' ,
) => {
	const total = session.items.length;
	const delta = direction === 'next' ? 1 : -1;
	const toIndex = total === 0 ? 0 : ( session.activeIndex + delta + total ) % total;
	const plan = planCarouselFrame( {
		visible : true ,
		cursor : session.cursor ,
		targetIndex : toIndex ,
		targetIds : session.items.map( ( item ) => item.id ) ,
		direction ,
	} );
	const next : CarouselSession = {
		...session ,
		visible : true ,
		activeIndex : toIndex ,
		direction ,
		cursor : plan.presentation === 'idle' ? session.cursor : plan.nextCursor ,
	};
	return {
		session : next ,
		record : recordFromPlan( session , 'step' , true , direction , toIndex , plan , plan.animation ) ,
	};
};

let carouselOpSeq = 0;

/**
 * @description 写进性能通道。主进程直接落盘；渲染进程再由 IPC 送到同一份 carousel-ops.jsonl。
 */
export const emitCarouselOp = (
	proc : 'main' | 'renderer' ,
	entry : Record<string , unknown> & { ctxId? : string } ,
) => {
	const stamped = {
		seq : ++carouselOpSeq ,
		ts : Date.now() ,
		proc ,
		...entry ,
	};
	perf.mark( CAROUSEL_OP_PHASE , proc , typeof entry.ctxId === 'string' ? entry.ctxId : '' , stamped );
	perf.flush();
	const faults = Array.isArray( entry.faults ) ? entry.faults.join( ',' ) : '';
	console.log(
		`[Carousel] ${ proc } ${ String( entry.kind || '' ) } ${ String( entry.gesture || entry.command || entry.reason || '' ) } idx=${ String( entry.activeIndex ?? '-' ) } anim=${ String( entry.animation || '-' ) } visible=${ String( entry.visible ?? '-' ) } faults=${ faults || '-' }` ,
	);
	return stamped;
};

import { presentCarousel , type CarouselPresentation } from './switch-ai-bar-motion.utility';
import { perf } from './utils/switch-perf-recorder.utility';
