

export const reaxel_AIViews = reaxel(() => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		AIViews : AIData.map( ({label,AIName,domain}):AIView => {
			return {
				label ,
				AIName ,
				view : null,
				domain,
			};
		} ) ,
	} );
	
	const rtn = {
		get currentAIView() {
			const { currentViewName } = Reaxel_View.store;
			if(!AIKeys.find(k => currentViewName === k)){
				return null;
			}
			return store.AIViews.find( ({AIName}) => AIName === currentViewName );
		},
		initAIView( name:AI ){
			mutate( s => {
				const targetView = s.AIViews.find( ( { AIName } ) => AIName === name );
				if( !targetView.view ) {
					targetView.view = initWebContentsView( {
						type : 'AI-View' ,
						domain : targetView.domain ,
					} );
				}
			} );
		}
	}
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
})

import {
	AI ,
	AIData ,
	AIKeys ,
	AIView ,
} from './data';
import { initWebContentsView } from "#main/reaxels/Views/utils/initWebContentsView";
import {BrowserWindow,app, Menu, MenuItem,WebContentsView,View ,autoUpdater , shell } from 'electron';
import { mainWindow } from "#main/mainWindow";
import ElectronStore from 'electron-store';
import { Reaxel_View } from '../';
