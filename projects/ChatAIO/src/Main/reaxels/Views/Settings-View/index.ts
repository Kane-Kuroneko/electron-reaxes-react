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
				/* 须静态 import：Views 为 webpack async module，sync require 得到 Promise */
				refreshBounds : ( settingsView ) => {
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
import { Reaxel_View } from '#main/reaxels/Views';
import { initWebContentsView } from "#main/reaxels/Views/utils/initWebContentsView";
import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import * as path from 'node:path';
