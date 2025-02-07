export const pageLoaded = new Promise( ( resolve ) => {
	if( document.readyState === 'complete' ) {
		resolve(null);
	} else {
		window.addEventListener( 'load' , resolve );
	}
} );
