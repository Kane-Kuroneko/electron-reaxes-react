export const Routing = reaxper( () => {
	
	return <HashRouter>
		<Routes>
			<Route
				path = "tests"
				Component = { RuntimeTester }
			/>
			
			<Route
				path = "/"
				Component = { Layout }
			>
				<Route
					Component = { Index }
					index
				/>
				<Route
					path = "hotkey-enhancer"
					Component = { HotkeyEnhancer }
				/>
				<Route
					path = "cheats"
					Component = { Cheats }
				/>
			</Route>
		
		</Routes>
	</HashRouter>;
} );

const Index = reaxper( () => {
	const { GUI_Core_SetState , GUI_Core_Store } = reaxel_GUI_Core();
	useEffect( () => {
		GUI_Core_SetState( { hash : location.hash } );
	} , [] );
	return <Navigate to = "/hotkey-enhancer" />;
} );

import { reaxel_GUI_Core } from '#renderer/reaxels/core';
import { RuntimeTester } from '#renderer/pages/Runtime-Tester';
import { Cheats } from '#renderer/pages/Cheats';
import { HotkeyEnhancer } from '#renderer/pages/Hotkey-Enhancer';
import { Layout } from '#renderer/components/Layout';
import { HashRouter , Route , Routes , Navigate} from 'react-router-dom';
