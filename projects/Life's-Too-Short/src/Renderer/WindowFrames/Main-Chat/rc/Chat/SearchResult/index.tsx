export const SearchResult = reaxper( () => {
	
	
	const searchResults = [];
	
	const items: ItemType[] = [
		{
			key : '' ,
			title : '' ,
			label : '' ,
			
		},
	];
	
	if(!searchResults.length){
		return <Empty>No result found</Empty>;
	}
	
	return <Menu
		items={items}
	/>;
} );




import { Menu , Empty } from 'antd';
import { ItemType } from 'antd/lib/menu/interface';
