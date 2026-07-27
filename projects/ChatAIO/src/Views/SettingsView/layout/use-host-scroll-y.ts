/**
 * 测量宿主容器高度，算出 antd Table `scroll.y`（扣除表头）。
 * 宿主须由 flex 布局获得确定高度（见 `.settings-table-host`）。
 */
export const useHostScrollY = (
	hostRef : React.RefObject<HTMLElement | null> ,
	options : {
		/** 表头未渲染时的回退高度 */
		fallbackHeaderHeight? : number;
		/** 额外预留（如边框、分页等） */
		extra? : number;
		minY? : number;
	} = {} ,
) => {
	const {
		fallbackHeaderHeight = 39 ,
		extra = 0 ,
		minY = 120 ,
	} = options;
	const [ scrollY , setScrollY ] = useState<number | undefined>( undefined );

	useLayoutEffect( () => {
		const host = hostRef.current;
		if( !host ) {
			return;
		}

		const measure = () => {
			const header = host.querySelector(
				'.ant-table-header' ,
			) as HTMLElement | null
				?? host.querySelector( '.ant-table-thead' ) as HTMLElement | null;
			const headerH = header?.offsetHeight || fallbackHeaderHeight;
			const next = Math.max( minY , host.clientHeight - headerH - extra );
			setScrollY( prev => ( prev === next ? prev : next ) );
		};

		measure();
		const ro = new ResizeObserver( () => {
			measure();
		} );
		ro.observe( host );
		return () => {
			ro.disconnect();
		};
	} , [ hostRef , fallbackHeaderHeight , extra , minY ] );

	return scrollY;
};

import {
	useLayoutEffect ,
	useState ,
} from 'react';
