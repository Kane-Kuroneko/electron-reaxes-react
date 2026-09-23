/**
 * 两个轮播 case 的需求判定。只看用户能观察到的采样，不读实现里的 park/step/日志字段。
 * 需求：docs/issues/floating-view-carousel-absolute-select.md
 * - 菜单点名：轮播不出现，中心卡是点中的那张，顺序是启用列表。
 * - 顺序下一格：轮播出现，并且从刚才那张滑到相邻一张；中途不能换成另一份列表。
 * - 顺序切到下一张后 select 上一个，再按 Next：条不透明时从刚选中的卡滑到相邻一张，不能淡入时目标已经在正中。
 */

export type CarouselSightSample = {
	t : number;
	visible : boolean;
	centerId : string;
	orderIds : string[];
	transitionMs : number;
	opacity : number;
	highlightedId : string;
	highlightedX : number;
};

const sameIds = ( left : readonly string[] , right : readonly string[] ) => {
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

export const neighborId = (
	fromId : string ,
	enabledIds : readonly string[] ,
	direction : 'next' | 'previous' ,
) => {
	const index = enabledIds.indexOf( fromId );
	if( index < 0 || enabledIds.length === 0 ) {
		return '';
	}
	if( direction === 'next' ) {
		return enabledIds[( index + 1 ) % enabledIds.length];
	}
	return enabledIds[( index - 1 + enabledIds.length ) % enabledIds.length];
};

const settledMatch = (
	samples : readonly CarouselSightSample[] ,
	centerId : string ,
	enabledIds : readonly string[] ,
	visible : boolean ,
) => {
	for( let index = samples.length - 1 ; index >= 0 ; index-- ) {
		const sample = samples[index];
		if( sample.visible === visible
			&& sample.centerId === centerId
			&& sameIds( sample.orderIds , enabledIds ) ) {
			return sample;
		}
	}
	return null;
};

/**
 * @description 菜单点名之后。轮播必须停在隐藏的选中项上，顺序等于启用列表。
 * 上一个手势若已经把条留在屏幕上，只忽略开头那些还停在别的卡上的可见采样；
 * 一旦中心变成选中项，再保持可见或播过渡，就是菜单把轮播叫出来或跳出。
 */
export const judgeMenuSelect = (
	samples : readonly CarouselSightSample[] ,
	selectedId : string ,
	enabledIds : readonly string[] ,
) => {
	const faults : string[] = [];
	if( samples.length === 0 ) {
		faults.push( 'no-samples' );
		return faults;
	}
	let start = 0;
	const parksOnSelection = samples.some( ( sample ) => {
		return sample.visible === false && sample.centerId === selectedId;
	} );
	if( parksOnSelection ) {
		while(
			start < samples.length
			&& samples[start].visible
			&& samples[start].centerId !== selectedId
		) {
			start += 1;
		}
	}
	const relevant = samples.slice( start );
	if( relevant.some( ( sample ) => sample.visible ) ) {
		faults.push( 'carousel-shown' );
	}
	if( !settledMatch( relevant , selectedId , enabledIds , false ) ) {
		faults.push( 'not-parked-on-selection' );
	}
	if( relevant.some( ( sample ) => sample.visible && sample.transitionMs > 0 ) ) {
		faults.push( 'menu-animated' );
	}
	return faults;
};

/**
 * @description 顺序一格。条要出现；可见期间中心必须先是 fromId，再滑到相邻那张；顺序不能中途换成另一份列表。
 */
export const judgeAdjacentStep = (
	samples : readonly CarouselSightSample[] ,
	fromId : string ,
	enabledIds : readonly string[] ,
	direction : 'next' | 'previous' ,
) => {
	const faults : string[] = [];
	const targetId = neighborId( fromId , enabledIds , direction );
	if( !targetId ) {
		faults.push( 'unknown-neighbor' );
		return faults;
	}
	if( !settledMatch( samples , targetId , enabledIds , true ) ) {
		faults.push( 'not-on-neighbor' );
	}
	const enabledKey = enabledIds.join( '|' );
	const sawOtherList = samples.some( ( sample ) => {
		return sample.opacity >= 0.9
			&& sample.orderIds.length > 0
			&& sample.orderIds.join( '|' ) !== enabledKey;
	} );
	if( sawOtherList ) {
		faults.push( 'list-swapped' );
	}
	const sawFromWhileVisible = samples.some( ( sample ) => {
		return sample.visible
			&& sample.centerId === fromId
			&& sameIds( sample.orderIds , enabledIds );
	} );
	const slid = samples.some( ( sample ) => {
		return sample.visible
			&& sample.transitionMs > 0
			&& ( sample.centerId === fromId || sample.centerId === targetId );
	} );
	if( !sawFromWhileVisible || !slid ) {
		faults.push( 'no-slide' );
	}
	return faults;
};

/**
 * @description 条已经不透明时，高亮卡必须先停在 fromId，再滑到相邻一张。
 * 淡入结束时高亮已经是目标，就是整条跳出，不是滚动。
 */
export const judgeVisibleScroll = (
	samples : readonly CarouselSightSample[] ,
	fromId : string ,
	enabledIds : readonly string[] ,
	direction : 'next' | 'previous' ,
) => {
	const faults = judgeAdjacentStep( samples , fromId , enabledIds , direction );
	const targetId = neighborId( fromId , enabledIds , direction );
	const highlighted = ( sample : CarouselSightSample ) => sample.highlightedId || sample.centerId;
	const opaqueFrom = samples.some( ( sample ) => {
		return sample.opacity >= 0.9 && highlighted( sample ) === fromId;
	} );
	if( !opaqueFrom ) {
		faults.push( 'pop-in' );
	}
	let moved = false;
	let previousX : number | null = null;
	for( const sample of samples ) {
		if( sample.opacity < 0.9 ) {
			previousX = null;
			continue;
		}
		const id = highlighted( sample );
		if( id !== fromId && id !== targetId ) {
			continue;
		}
		if( previousX !== null && Math.abs( sample.highlightedX - previousX ) >= 40 ) {
			moved = true;
		}
		previousX = sample.highlightedX;
	}
	if( !moved ) {
		faults.push( 'no-visible-travel' );
	}
	return faults.filter( ( fault , index ) => faults.indexOf( fault ) === index );
};

export const summarizeCarouselSight = ( samples : readonly CarouselSightSample[] ) => {
	const lines : string[] = [];
	for( const sample of samples ) {
		const line = `op=${ sample.opacity } hi=${ sample.highlightedId || '-' }@${ sample.highlightedX } vis=${ sample.visible } center=${ sample.centerId || '-' } n=${ sample.orderIds.length } ms=${ sample.transitionMs }`;
		if( lines[lines.length - 1] !== line ) {
			lines.push( line );
		}
	}
	return lines.join( '\n' );
};
