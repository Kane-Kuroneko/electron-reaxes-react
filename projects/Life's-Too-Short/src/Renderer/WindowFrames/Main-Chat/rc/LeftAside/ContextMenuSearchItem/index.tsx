import { Input } from "antd";



export const useContextMenuSearchItem = () => {
	
	const {store,setState} = useReaxable({
		value : '',
		
	})
	const ContextMenuSearchItem = reaxper(() => {
		
		return <Input
			value={store.value}
			onChange={e => setState({value : e.target.value})}
			style={{
				width : '100%' ,
				marginBottom : 8 ,
			}}
			size="small"
			variant="borderless"
			placeholder="Search in Channels"
			onClick={ ( event ) => {
				event.stopPropagation();
				event.preventDefault();
			} }
		/>;
	});
	return {
		ContextMenuSearchItem,
	};
}
