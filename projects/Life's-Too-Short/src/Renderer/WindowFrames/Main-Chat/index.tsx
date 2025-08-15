const root = createRoot( document.getElementById( "react-app-root" ) );

@reaxper
class App extends Reaxlass {
	render() {
		
		return <Layout/>;
	}
}


root.render( <App /> );

import { Layout } from './rc/Layout';
import { Routing } from './routes';
import { createRoot } from "react-dom/client";
import './global.module.less';
