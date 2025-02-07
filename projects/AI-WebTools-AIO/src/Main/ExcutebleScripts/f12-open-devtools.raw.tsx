window.addEventListener( 'keydown' , ( evt ) => {
	// alert(typeof versions)
	if( evt.key.toLowerCase() === 'f12' ) {
		IPC.invoke( 'devtools' , {
			action : 'open' as 'open' | 'close' | 'toggle' ,
		} );
	}
} );


pageLoaded.then(() => {
	console.log(22222222);
})

import { pageLoaded } from './utils/pageLoaded';
