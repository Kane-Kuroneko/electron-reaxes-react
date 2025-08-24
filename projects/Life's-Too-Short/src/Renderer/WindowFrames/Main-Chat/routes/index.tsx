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
						element={ <Navigate to="chat" /> }
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
						path="chat"
						element={ <Outlet /> }
					>
						{/* 默认 /chat 时跳转到 /chat/new */ }
						<Route
							index
							element={ <Navigate
								to="new"
							/> }
						/>
						
						<Route
							path=":chat_id"
							element={ <ChatView /> }
						/>
						<Route
							path="new"
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
