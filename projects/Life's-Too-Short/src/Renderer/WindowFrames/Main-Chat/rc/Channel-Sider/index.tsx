
export const ChannelContainer = reaxper( () => {
	
	return <div
		className={less.channelContainer}
	>
		<SearchBar/>
		<FreeChat/>
		<Divider/>
		<UserChannels/>
	</div>
} );

import { SearchBar } from './SearchBar';
import {Divider} from './Divider';
import { FreeChat } from './Free-Chat';
import { UserChannels } from './User-Channels';

import less from './style.module.less';
