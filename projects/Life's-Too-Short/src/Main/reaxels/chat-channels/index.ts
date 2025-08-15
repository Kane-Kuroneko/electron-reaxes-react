export const reaxel_ChatChannels = reaxel(() => {
	
	const {store,setState,mutate} = createReaxable({
		channels : []
	})
	
	const rtn = {};
	
	return Object.assign(() => {
		
	}, {
		
	})
})

export const GlobalMessagesMapping = new Map()

import {reaxel,distinctCallback,collectDeps,obsReaction,createReaxable} from 'reaxes';
