export const reaxel_Sponsor = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = orzMobx( {
		Modal_sponsor_visible : false ,
		terms_visible : false,
		
		Collapse_expaned_keys : ['alipay'],
	} );
	
	const persist = Refaxel_BrowserPersist( 'GUI-Sponsor' )( { store , setState } );
	
	let ret = {
		Sponsor_Store : store,
		Sponsor_SetState : setState,
		Sponsor_Mutate : mutate,
		get visible() {
			return store.Modal_sponsor_visible;
		},
		get termsVisible() {
			return store.terms_visible;
		},
		
		toggleVisible(visible = !store.Modal_sponsor_visible){
			setState( { Modal_sponsor_visible : visible } );
		},
		toggleTermsVisible(visible = !store.terms_visible){
			setState( { terms_visible : visible } );
		}
	};
	
	return () => {
		
		return ret;
	};
} );

import { Refaxel_BrowserPersist } from '#generic/reaxels/browser-persist';
