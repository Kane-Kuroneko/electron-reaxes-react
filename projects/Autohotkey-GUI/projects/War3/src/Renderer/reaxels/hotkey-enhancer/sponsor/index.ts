export const reaxel_Sponsor = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		Modal_sponsor_visible : false ,
		terms_visible : false,
		
		Collapse_expaned_keys : ['alipay'],
	} );
	
	rehance_BrowserPersist( 'GUI-Sponsor' )( { store , setState } );
	
	let rtn = {
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
	return Object.assign(() => rtn , {
		store ,
		setState ,
		mutate ,
	});
} );

import { rehance_BrowserPersist } from '#generic/rehancers/browser-persist';
