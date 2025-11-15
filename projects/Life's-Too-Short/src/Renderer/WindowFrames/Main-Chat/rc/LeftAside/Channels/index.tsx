
export const Channels = reaxper( () => {
	
	return <div
		className={less.channelContainer}
	>
		<FreeChat/>
		<UserChannels/>
	</div>
} );

import { FreeChat } from './Free-Chat';
import { UserChannels } from './User-Channels';

import less from './style.module.less';
