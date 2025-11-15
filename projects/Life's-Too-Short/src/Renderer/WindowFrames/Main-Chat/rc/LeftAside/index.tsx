

export const LeftSide = reaxper( () => {

	return <div className="sidebar-left">
		<Logo/>
		<SearchBar/>
		{ reaxel_Chats.store.search.isSearching ? <SearchResult/> : <Channels /> }
		<User/>
	</div>;
} );

import { reaxel_Chats } from "#renderer/WindowFrames/shared/reaxels/chats";
import { SearchResult } from '#Main-Chat/rc/LeftAside/SearchResult';
import { Logo } from "#Main-Chat/rc/LeftAside/Logo";
import { User } from "#Main-Chat/rc/LeftAside/User";
import { Channels } from '#Main-Chat/rc/LeftAside/Channels';
import { SearchBar } from '#Main-Chat/rc/LeftAside/SearchBar';
import type { Message } from '#src/types/Message';
import type { Channel } from '#src/types/Channel';
import type { Chat } from '#src/types/Chat';
