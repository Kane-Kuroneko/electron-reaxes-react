const root = createRoot( document.getElementById( "react-app-root" ) );
const { store , setState } = orzMobx( { count : 0 } );
let count = 0;
@reaxper
class App extends Reaxlass {
	render() {

		return <MainContainer/>;
	}
}

root.render( <App /> );

import { MainContainer } from '#renderer/DropPadView/components/MainContainer';
import { createRoot } from "react-dom/client";
import './global.module.less';
