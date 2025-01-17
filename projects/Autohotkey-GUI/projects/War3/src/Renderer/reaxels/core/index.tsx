export const reaxel_GUI_Core = reaxel( () => {
	
	const { store , setState } = orzMobx( {
		
		hash : '#/hotkey-enhancer' ,
	} );
	
	Refaxel_BrowserPersist('GUI_Core')({store,setState});
	obsReaction( ( first ) => {
		const hash = location.hash;
		if( first && hash.replace('#/','') ) {
			setState( { hash } );
			return;
		} else {
			location.hash = store.hash;
		}
	} , () => [ store.hash ] );
	
	window.addEventListener( 'hashchange' , () => {
		crayon.blue( 'hash changed:  ' , location.hash );
		setState({
			hash : location.hash,
		})
	} );
	
	let rtn = {
		GUI_Core_Store : store,
		GUI_Core_SetState : setState,
		
	};
	return () => {
		
		return rtn;
	};
} );

import { Refaxel_BrowserPersist } from '#generic/reaxels/browser-persist';
