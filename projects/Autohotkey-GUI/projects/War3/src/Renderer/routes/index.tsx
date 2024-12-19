export const Routing = reaxper( () => {

	return <HashRouter>
		<Routes>
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

import { Cheats } from '#project/src/Renderer/pages/Cheats';
import { HotkeyEnhancer } from '#project/src/Renderer/pages/Hotkey-Enhancer';
import { Layout } from '#project/src/Renderer/components/Layout';
import { HashRouter , Route , Routes } from 'react-router-dom';
