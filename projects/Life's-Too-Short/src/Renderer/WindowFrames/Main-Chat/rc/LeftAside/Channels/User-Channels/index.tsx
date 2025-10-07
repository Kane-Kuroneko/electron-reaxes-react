
export const UserChannels = reaxper( () => {
	

	
	return <div
		className={ less.userChannels }
	>
		<ChannelHeader/>
		<ChannelWithContextMenu/>
	</div>;
	
} );
import { ChannelWithContextMenu } from "#Main-Chat/rc/LeftAside/Channels/User-Channels/Channel-With-ContextMenu";
import { ChannelHeader } from '#Main-Chat/rc/LeftAside/Channels/User-Channels/Header';
import less from './style.module.less';
