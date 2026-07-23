
const settingsViewApi = reaxel_SettingsView();
api.onSettingsViewNavigate( ( payload ) => {
	settingsViewApi.navigateFromMain( payload );
} );

const root = createRoot( document.getElementById( "react-app-root" ) );

root.render( <App /> );

import { App } from './App';
import { createRoot } from "react-dom/client";
import { reaxel_SettingsView } from '#SettingsView/reaxels/settings-view';
