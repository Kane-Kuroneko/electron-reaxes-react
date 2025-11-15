export const ScrollableSelect = reaxper( <P extends {value:string|number,label:string|number}[]>( props: ScrollableSelect<P>) => {
	
	return <div
		onWheel={ ( e ) => {
			const currentIndex = props.options.findIndex( it => it.value === props.value );
			if ( currentIndex === -1 ) return; // 没找到对应值, 防御性处理
			
			switch ( true ) {
				// 向下滚动, 但已选中的就是最后一项
				case e.deltaY > 0 && currentIndex === props.options.length - 1:
				// 向上滚动, 但已选中的就是第一项
				case e.deltaY < 0 && currentIndex === 0: {
					return;
				}
			}
			
			// 否则触发滚动选择
			const nextIndex = currentIndex + ( e.deltaY > 0 ? 1 : -1 );
			const nextSelected = props.options[nextIndex];
			
			props.onWheelSelect?.( nextSelected );
		} }
	
	>
		<Select<P[number]['value'] , P>
			onClick={ ( event ) => {
				props.onOpenToggle( !props.open );
			} }
			onSelect={ ( value , option ) => {
				props.onWheelSelect?.( props.options.find( it => it.value === value ) );
			} }
			value={ props.value }
			open={ props.open }
			onBlur={ () => {
				props.onOpenToggle( false );
			} }
			style={ { width : '120px' } }
			suffixIcon={ null }
		>
			{ props.options.map( ( {
				value ,
				label ,
			} ) => {
				return <Select.Option
					value={ value }
					key={ value }
				>{ label }</Select.Option>;
			} ) }
		</Select>
	</div>;
} );

export type ScrollableSelect<Options extends {value:string|number,label:string|number}[]> = {
	options:Options,
	open : boolean;
	value : Options[number]['value'],
	onWheelSelect(selected:Options[number]):void;
	onOpenToggle(open:boolean):void;
}
import { Select  } from 'antd';
