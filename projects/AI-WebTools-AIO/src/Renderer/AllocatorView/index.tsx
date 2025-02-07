const root = createRoot( document.getElementById( "react-app-root" ) );
const { store , setState } = orzMobx( { count : 0 } );
@reaxper
class App extends Reaxlass {
	render() {
		
		return <SporesBar/>;
	}
}

root.render( <App /> );

import { SporesBar } from './components/SporesBar';
import { createRoot } from "react-dom/client";
import './global.module.less';
