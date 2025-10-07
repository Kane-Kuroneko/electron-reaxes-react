export const reaxel_UI = reaxel(() => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		expanded_channels : {
			free_chat:true,
			user_channels : [],
		} ,
	} );
	
	const {
		toggleFreeChatExpand,
		setExpandChannels,
	} = rehance_ChannelExpandedList({
		store:store.expanded_channels,
		setState:setState.expanded_channels,
		mutate:mutate.expanded_channels,
	})();
	
	const rtn = {
		toggleFreeChatExpand,
		setExpandChannels,
	}
	
	return Object.assign(() => rtn, {
		store,
		setState,
		mutate
	})
})

import { rehance_ChannelExpandedList } from './channel-expanded-list';
