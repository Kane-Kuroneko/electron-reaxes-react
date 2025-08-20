const options: WheelPickerOption[] = [
	{
		value : 'gpt-4o' ,
		label : 'GPT-4o' ,
	} ,
	{
		value : 'gpt-5' ,
		label : 'GPT-5' ,
	} ,
	{
		value : 'gpt-4.1min2323i' ,
		label : 'GPT-4.1-min2323i' ,
	} ,
	{
		value : 'gpt-4.1min111i' ,
		label : 'GPT-4.1-mi111ni' ,
	} ,
	{
		value : 'gpt-4.1mi333ni' ,
		label : 'GPT-4.1-min444i' ,
	} ,
];

interface WheeledPickerProps {
	options,
	value,
	onSelect(),
	infinite:boolean;
	
}



export const WheeledPicker = reaxper( (props:WheeledPickerProps) => {
	const ref = useRef();
	const {store,setState} = useReaxable({
		selected : "gpt-4o",
		open : false,
	})
	
	
	useEffect( () => {
		const handleGlobalClick = ( e: MouseEvent ) => {
			if( ref.current && (
				e.composedPath() as Node[]
			).includes( ref.current ) ) {
				return;
			}
			setTimeout( () => {
				setState( { open : false } );
			} , 10 );
		};
		document.addEventListener( 'mousedown' , handleGlobalClick , true );
		return () => {
			document.removeEventListener( 'mousedown' , handleGlobalClick , true );
		};
	} , [] );
	
	return <div
		className={classnames(less.wheeledPicker,store.open && "open")}
		ref = {ref}
		onClick={() => {
			setState({open : !store.open});
		}}
	>
		<WheelPickerWrapper>
			<WheelPicker
				options={ options }
				value={ store.selected }
				onValueChange={ (value) => {
					setState( { selected : value } );
				} }
				infinite
			/>
		</WheelPickerWrapper>
	</div>;
} );

import classnames from 'classnames';


import {
	WheelPicker ,
	WheelPickerWrapper ,
	type WheelPickerOption ,
} from "./sc@react-wheel-picker";
import less from './style.module.less';




