export const App = reaxper( () => {
	const { handleCommand } = reaxel_FloatingLayer();

	useEffect( () => {
		const disposable = api.onFloatingLayerCommand( command => {
			handleCommand( command );
		} );

		return () => {
			disposable.dispose();
		};
	} , [] );

	return <main className="floating-layer-root">
		<SwitchAiBar />
	</main>;
} );

import { SwitchAiBar } from './components/SwitchAiBar';
import { reaxel_FloatingLayer } from './reaxels/floating-layer';
import { reaxper } from 'reaxes-react';
import './index.less';
