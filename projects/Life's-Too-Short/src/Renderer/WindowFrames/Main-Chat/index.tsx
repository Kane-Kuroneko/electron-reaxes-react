const root = createRoot( document.getElementById( "react-app-root" ) );

@reaxper
class App extends Reaxlass {
	render() {
		return <Routing/>;
	}
}

root.render( <App /> );

import '#Main-Chat/reaxels/dev-watcher';
import { useParams } from 'react-router-dom';
import { Routing } from './routes';
import { createRoot } from "react-dom/client";
import './global.module.less';


