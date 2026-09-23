/**
 * 轮播只负责「相对一格」这一种呈现。
 * 菜单是绝对选中：不弹出，只在隐藏时把 Swiper 停到当前 AI。
 * 顺序切换才显示，并且永远只滑一格。
 * 设计：docs/issues/floating-view-carousel-absolute-select.md
 */

export type CarouselPresentation = 'idle' | 'park' | 'step';

const sameIdSequence = ( left:readonly string[] , right:readonly string[] ) => {
	if( left.length !== right.length ) {
		return false;
	}
	for( let index = 0 ; index < left.length ; index++ ) {
		if( left[index] !== right[index] ) {
			return false;
		}
	}
	return true;
};

/**
 * @description 这次 store 更新该怎么呈现。
 * 不可见时的任何下标/列表变化都是 park：换掉 Swiper，用 initialSlide 停在目标上。
 * 可见时的下标变化是 step：调用方保证只走了一格，这里不再按环路距离连滑。
 */
export const presentCarousel = ( input:{
	visible : boolean;
	parkedIndex : number;
	parkedIds : readonly string[];
	targetIndex : number;
	targetIds : readonly string[];
} ):CarouselPresentation => {
	const samePlace = input.parkedIndex === input.targetIndex
		&& sameIdSequence( input.parkedIds , input.targetIds );
	if( samePlace ) {
		return 'idle';
	}
	if( input.visible !== true ) {
		return 'park';
	}
	return 'step';
};
