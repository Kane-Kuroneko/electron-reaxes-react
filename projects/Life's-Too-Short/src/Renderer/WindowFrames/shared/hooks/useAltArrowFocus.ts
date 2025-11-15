/**
 * @desc
 * [Alt] + ⬆️/⬇️ 键切换焦点
 * @description
 * `getElements`需要动态返回,因为如果是静态传入,在useEffect()运行时传入的element还未commit到dom中,element必须在useEffect执行回调时才能拿到挂载好的elements
 * @param getElements 可foucs的元素合集,按照上下顺序排列,这个顺序决定了按上下键时的切换顺序
 * @param cycle 是否循环切换,默认true
 * @param triggerCondition 只有为true时才会触发hooks内的逻辑
 */
export const useAltArrowFocus = ( {
	getElements ,
	cycle = true ,
	getTriggerCondition ,
}: {
	getElements: () => Element[];
	cycle?: boolean;
	getTriggerCondition?: () => boolean;
} ) => {
	useEffect( () => {
		
		const handler = ( e: KeyboardEvent ) => {
			if( !getTriggerCondition() ) {
				return;
			}
			if( !e.altKey || (
				e.key !== 'ArrowUp' && e.key !== 'ArrowDown'
			) ) return;
			if( e.key === 'ArrowDown' ) {
				var offset = 1;
			} else if( e.key === 'ArrowUp' ) {
				var offset = -1;
			}
			
			const currentFoucs = document.activeElement;
			const currentIndex = getElements().findIndex( ( el ) => el === currentFoucs );
			if( currentIndex === -1 ) return;
			const elements = getElements();
			const nextElementIndex = cycle === false ?
				
				currentIndex + offset :
				
				(currentIndex + offset + elements.length) % elements.length;
			
			if( nextElementIndex < 0 || nextElementIndex >= elements.length ) return;
			
			const nextElement = elements[nextElementIndex] as HTMLElement;
			if( nextElement ) {
				e.preventDefault();
				nextElement.focus();
			}
		};
		window.addEventListener( 'keydown' , handler );
		return () => window.removeEventListener( 'keydown' , handler );
		
	} , [] );
};
