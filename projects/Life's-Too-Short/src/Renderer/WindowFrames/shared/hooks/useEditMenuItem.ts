export const useEditMenuItem = ({
	value,
	
}:UseEditMenuItemProps) => {

	const {
		store ,
		setState,
	} = useReaxable( {
		editing : false ,
		value,
	} );
	
	const ref = useRef();
	
	
	
	return {
		get editing(){
			return store.editing;
		},
		get value(){
			return store.value;
		},
		setValue(value:string){
			setState({value});
		},
		toggleEditing(editing = !store.editing){
			setState({editing});
		},
		reset(){
			setState({value});
		}
	}
}

export type UseEditMenuItemProps = {
	value : string,
	
}
