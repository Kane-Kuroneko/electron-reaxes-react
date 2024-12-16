export const Routing = reaxper( () => {
	
	
	return <HashRouter>
		<Routes>
			<Route
				path = "/"
				Component = { Layout }
			>
				<Route
					path = "hot-enhancer"
					Component = { HotEnhancer }
				/>
				
				<Route
					path = "cheats"
					Component = { Cheats }
				></Route>
			
			</Route>
		
		</Routes>
	</HashRouter>;
} );

import { Cheats } from '#project/src/Renderer/pages/Cheats';
import {HotEnhancer} from '#project/src/Renderer/pages/Hot-Enhancer';
import { Layout } from '#project/src/Renderer/components/Layout';
import { Routes , HashRouter , Route } from 'react-router-dom';
