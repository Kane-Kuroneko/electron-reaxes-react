const root = createRoot( document.getElementById( "react-app-root" ) );

@reaxper
class App extends Reaxlass {
	render() {
		
		return <Routing/>;
	}
}

import { WheeledPicker } from '#renderer/WindowFrames/shared/rc/Wheeled-Picker';
root.render( <App /> );

import { Layout } from './rc/Layout';
import { Routing } from './routes';
import { createRoot } from "react-dom/client";
import './global.module.less';
