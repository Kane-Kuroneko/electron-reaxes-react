export const reaxel_WCVHub = reaxel(() => {
	const {store,setState,mutate,} = orzMobx( {
		wcvList : [] as WebContentsViewController[] ,
	} );
	
	let rtn = {
		async createWcv(options:createWcvOptions){
			const wcvctrl = await createWebContentsView( options );
			mutate( s => s.wcvList.push( wcvctrl ) );
		}
	};
	return () => {
		
		return rtn;
	}
})

export type WebContentsViewController = {
	controller : {
		spore_id : number
	},
	wcv : WebContentsView,
}


import { createWebContentsView , Options as createWcvOptions} from './create-wcv';
import {WebContentsView} from 'electron';
