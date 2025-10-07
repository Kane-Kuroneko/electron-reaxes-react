import { createHooksTunnel } from "#renderer/WindowFrames/shared/utils/exper-hooks-tunnel";

export const SearchBar = reaxper( () => {
	
	const {setFilterScope,setFilterText} = reaxel_Chats();
	
	const { scope } = reaxel_Chats.store.search;
	
	if(_.isString(scope) && scope.startsWith('channelid_')){
		var channel = reaxel_Chats.store.channels.find( c => c.channel_id === scope );
	}
	
	const {ref} = useStealthSearchBarFocus();
	
	const tagRender = ( { label }  ) => <Tag
		closable
		onClose={() => {
			setFilterScope( null );
		}}
	>Search in <b>{ label }</b></Tag>;
	
	return <div className={ less.searchBar }>
		<Select
			ref={ ref }
			mode="tags"
			open={ false }
			style={ { width : '100%' } }
			options={ [
				{
					value : 'all' ,
					label : 'All Chats' ,
				} ,
				{
					value : 'free-chats' ,
					label : 'Free Chats' ,
				} ,
				{
					value : 'all-channels' ,
					label : 'All Channels' ,
				} ,
			].concat( reaxel_Chats.store.channels.map( channel => {
				return {
					value : channel.channel_id ,
					label : channel.channel_title.slice( 0,5 ) ,
				};
			} ) ) }
			value={ scope ? [scope] : null }
			inputValue={reaxel_Chats.store.search.search_text}
			onChange={(value,option) => {
				// console.log(value,option);
				console.log(reaxel_Chats.store.search.search_text);
			}}
			onSearch={ ( value) => {
				setFilterText(value);
			}}
			tagRender={ tagRender }
			onClear={ () => {
				setFilterScope( null );
			} }
			placeholder="Search chats"
			allowClear
			suffixIcon={ null }
		/>
	</div>;
} );


import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
import { Input ,Select, Tag} from 'antd';
import less from './style.module.less';
import { createHookStealer } from "#renderer/WindowFrames/shared/utils/exper-outside-hooks";
import {RefSelectProps} from 'antd';
import { LegacyRef } from "react";
import { useStealthSearchBarFocus } from "#Main-Chat/hook-tunnels/searchbar-focus";
