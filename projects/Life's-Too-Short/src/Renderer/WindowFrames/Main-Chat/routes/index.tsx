export const Routing = reaxper( () => {
	
	return <>
		<HashRouter>
			<Routes>
				<Route
					path="/"
					Component={ Layout }
				>
					<Route
						index
						element={ <Home/> }
					/>
					<Route
						path="settings"
					>
						<Route
							index
							element={ <Navigate to="general" /> }
						/>
						<Route
							path=":setting_id"
							element={ <Settings /> }
						/>
					</Route>
					
					<Route
						path="channel"
					>
						<Route
							index
							Component={reaxper(function CreateNewChannel () {
								return 'New Channel';
							})}
						/>
						<Route
							path=":channel_id"
							Component={reaxper(function ChannelHome (){
								return 'Channel Home';
								
							})}
							
						>
							<Route
								index
								Component={reaxper(function ChannelHome () {
									return 'Channel Home';
								})}
							/>
							<Route
								path="new-chat"
								Component={reaxper(function NewChatInChannel () {
									return 'New Chat In Channel';
								})}
							/>
						</Route>
					</Route>
					
					
					
					<Route
						path="chat"
						element={ <Outlet /> }
					>
						{/* 默认 /chat 时跳转到 /chat/new */ }
						<Route
							index
							element={ <Navigate
								to="new-chat"
							/> }
						/>
						
						<Route
							path=":chat_id"
							element={ <ChatView /> }
						/>
						<Route
							path="new-chat"
							Component={reaxper(function NewChat(){
								return 'New Chat';
							})}
							element={ <Home /> }
						/>
					</Route>
					
					
					<Route
						path="test"
						Component={ RuntimeTester }
					/>
				</Route>
			
			</Routes>
		</HashRouter>
		
	</>;
} );

import { QueryRoute } from '#renderer/WindowFrames/shared/rc/QueryRoute';
import { ChatView } from "#Main-Chat/rc/Chat";
import { Settings } from '#Main-Chat/rc/Settings';
import { RuntimeTester } from '#renderer/WindowFrames/shared/rc/Runtime-Test';
import { Layout } from '#Main-Chat/rc/Layout';
import {
	HashRouter ,
	Navigate ,
	Outlet ,
	Route ,
	Routes ,
	useParams ,
} from 'react-router-dom';
import { Home } from "#Main-Chat/rc/Home";
