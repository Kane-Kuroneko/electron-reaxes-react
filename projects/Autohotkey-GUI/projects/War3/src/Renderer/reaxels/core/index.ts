export const reaxel_GUI_Core = reaxel(() => {
	
	const { store , setState , mutate } = createReaxable({
		hash : '#/hotkey-enhancer' ,
	});
	
	rehance_BrowserPersist('GUI_Core')({ store , setState });
	
	obsReaction(( first ) => {
		const hash = location.hash;
		if( first && hash.replace('#/' , '') ) {
			setState({ hash });
			return;
		} else {
			location.hash = store.hash;
		}
	} , () => [ store.hash ]);
	
	window.addEventListener('hashchange' , () => {
		crayon.blue('hash changed:  ' , location.hash);
		setState({
			hash : location.hash ,
		});
	});
	
	const rtn = {};
	return Object.assign(() => {
		return rtn;
	} , {
		store ,
		setState ,
		mutate ,
	});
});

import { rehance_BrowserPersist } from '#generic/rehancers/browser-persist';
