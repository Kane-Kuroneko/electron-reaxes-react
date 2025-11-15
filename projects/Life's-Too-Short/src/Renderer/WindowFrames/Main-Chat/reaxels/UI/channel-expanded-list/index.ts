export const rehance_ChannelExpandedList = ({
	store,
	setState,
	mutate
}:{
	store:ReaxelUI['store']['expanded_channels'],
	setState:ReaxelUI['setState']['expanded_channels'],
	mutate:ReaxelUI['mutate']['expanded_channels'],
}) => () => {
	
	setState({
		// leftSideChannelsExpandList : ['free-chat']
	})
	
	const toggleFreeChatExpand = (expand = !store.free_chat) => {
		setState({free_chat : expand});
	}
	
	const setExpandChannels = (channels:string[]) => {
		setState({user_channels:channels});
	}
	
	return {
		toggleFreeChatExpand,
		setExpandChannels,
	};
}



type ReaxelUI = Pick<typeof import('#renderer/WindowFrames/Main-Chat/reaxels/UI').reaxel_UI , "store" | "setState" | "mutate">;
