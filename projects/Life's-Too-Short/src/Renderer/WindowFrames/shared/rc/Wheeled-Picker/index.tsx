interface WheeledPickerProps<T extends{
	value : any,
	label : React.ReactNode
}[] = {
	value : any,
	label : React.ReactNode
}[]> {
	options : T;
	value : T[number]['value'];
	onSelect(value:T[number]['value']);
	infinite?:boolean;
	itemHeightPx? : number;
	title?:string;
}

export const WheeledPicker = reaxper( (props:WheeledPickerProps) => {

	const {store,setState} = useReaxable({
		selected : "gpt-5-nano",
		open : false,
	})
	
	const contextMenuRef = useContextMenuGlobalCancel<HTMLDivElement>( {
		close : () => setState( { open : false } ) ,
	} );
	
	return <div
		className={classnames(less.wheeledPicker,store.open && "open")}
		ref = {contextMenuRef}
		title={props.title}
		onClick={() => {
			setState({open : !store.open});
		}}
	>
		<WheelPickerWrapper>
			<WheelPicker
				options={ props.options }
				value={ props.value }
				onValueChange={ props.onSelect }
				infinite = {props.infinite ?? true}
				optionItemHeight={props.itemHeightPx ?? 30}
			/>
		</WheelPickerWrapper>
	</div>;
} );

import { useContextMenuGlobalCancel } from "#renderer/WindowFrames/shared/hooks/useContextMenuGlobalCancel";
import {
	WheelPicker ,
	WheelPickerWrapper ,
	type WheelPickerOption ,
} from "./sc@react-wheel-picker";
import classnames from 'classnames';
import less from './style.module.less';




