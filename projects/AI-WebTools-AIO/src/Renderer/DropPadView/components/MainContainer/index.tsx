export const MainContainer = reaxper(() => {
	const { Core_Store } = reaxel_Core();
	
	return <SporeViewContainer/>;
})


import { SporeViewContainer } from '#renderer/DropPadView/components/SporeViewContainer';
import { reaxel_Core } from '#renderer/DropPadView/reaxels/core';

