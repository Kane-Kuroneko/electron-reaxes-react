export const App = reaxper( () => {
	const { handleCommand } = reaxel_FloatingView();

	useEffect( () => {
		const disposable = api.onFloatingViewCommand( command => {
			handleCommand( command );
		} );

		return () => {
			disposable.dispose();
		};
	} , [] );

	return <main className="floating-view-root">
		<SwitchAiBar />
	</main>;
} );

import { SwitchAiBar } from './components/SwitchAiBar';
import { reaxel_FloatingView } from './reaxels/floating-view';
import { reaxper } from 'reaxes-react';
import './index.less';
