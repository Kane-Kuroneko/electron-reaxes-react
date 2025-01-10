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

import { RuntimeTester } from '#renderer/pages/Runtime-Tester';
import { Cheats } from '#renderer/pages/Cheats';
import { HotkeyEnhancer } from '#renderer/pages/Hotkey-Enhancer';
import { Layout } from '#renderer/components/Layout';
import { HashRouter , Route , Routes } from 'react-router-dom';
