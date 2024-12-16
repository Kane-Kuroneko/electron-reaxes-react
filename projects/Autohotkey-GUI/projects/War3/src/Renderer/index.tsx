const root = createRoot( document.getElementById( "react-app-root" ) );

@reaxper
class App extends Reaxlass {
	render() {
		
		return <Routing/>;
	}
}

root.render( <App /> );


import { Routing } from '#project/src/Renderer/routes';
import { createRoot } from "react-dom/client";
import './styles/index.less';
import './styles/global.module.less';
