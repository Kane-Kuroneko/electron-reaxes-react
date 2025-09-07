export const DevWatcher = reaxel( () => {
	
	//@ts-ignore
	window.loc = () => (location.href.replace(`${location.origin}/main-chat/#`,''));
	
	//@ts-ignore
	window.chats = () => {
		return JSON.parse(JSON.stringify(reaxel_Chats.store.chats))
	}
	//@ts-ignore
	window.messages = () => {
		return JSON.parse(JSON.stringify(reaxel_Chats.store.messages))
	}
	//@ts-ignore
	window.prom = async () => {
		await xPromise((res) => {
			setTimeout(() => {
				res(Math.random())
			}, 1000);
		});
	}
})


import { reaxel_Chats } from '#renderer/WindowFrames/shared/reaxels/chats';
