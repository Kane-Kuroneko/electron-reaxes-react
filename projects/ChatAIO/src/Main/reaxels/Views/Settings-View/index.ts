const {absAppRunningPath} = reaxel_ElectronENV()
export const reaxel_SettingsView = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		settingsView : {
			view : checkAs<WebContentsView>(null),
		}
	} );
	
	function initSettingsView(){
		const {view} = store.settingsView;
		if(view) return view;
		setState.settingsView( {
			view : initWebContentsView( {
				type : 'Settings-View' ,
				/* 延迟取 Reaxel_View，避免与 Views/index ↔ Settings-View 循环依赖 */
				refreshBounds : ( settingsView ) => {
					const { Reaxel_View } = require( '#main/reaxels/Views' ) as typeof import( '#main/reaxels/Views' );
					Reaxel_View().fitContentView( settingsView );
				} ,
				webPreferences:{
					preload: path.join(absAppRunningPath, 'preload.js'),
				}
			} ) ,
		} );
		return store.settingsView.view;
	}
	
	const rtn = {
		initSettingsView,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );


import { WebContentsView } from "electron";
import { initWebContentsView } from "#main/reaxels/Views/utils/initWebContentsView";
import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import * as path from 'node:path';
