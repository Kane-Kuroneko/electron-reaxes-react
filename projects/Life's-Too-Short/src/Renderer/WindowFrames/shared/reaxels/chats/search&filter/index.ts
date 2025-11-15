
export const rehance_SearchAndFilter = ({store,setState}:SearchReaxable) => () => {
	
	return {
		getFiltered():Result[]{
			
			if( !store.search_text ) return [];
			
			return reaxel_Chats.store.chats.filter( chat => {
				switch( store.scope ){
					case 'all' :
						return true;
					case 'free-chats' :
						if( chat.is_free_chat ) return true;
					case 'all-channels' :
						if( !chat.is_free_chat ) return true;
				}
				if(typeof store.scope === 'string' && store.scope.startsWith('channelid_') ){
					return chat.fk_channel_id === store.scope;
				}
				return false;
			} ).map( chat => {
				
				return {
					chat_id : chat.chat_id ,
					preview : '' ,
				};
			} );
		},
		
		setFilterScope(filter:typeof store.scope){
			//不能用setState!!会让search内的getter失效
			setState( {
				scope : filter ,
			} );
			stealthSearchBarFocus(({focus}) =>{
				focus();
			});
		},
		
		setFilterText(text:string){
			//不能用setState!!会让search内的getter失效
			setState( {
				search_text : text ,
			} );
		}
	}
}

type Result = {
	chat_id : string ,
	preview : string ,
};

type ReaxelChats = typeof import('../').reaxel_Chats;

type SearchReaxable = {
	store : ReaxelChats['store']['search'];
	setState : ReaxelChats['setState']['search'];
}
import { stealthSearchBarFocus } from "#Main-Chat/hook-tunnels/searchbar-focus";
import { reaxel_Chats } from '../';
