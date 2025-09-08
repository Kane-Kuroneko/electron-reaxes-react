export const useCtrlEnter = ( fn: ( activeElement: Element | null , e: KeyboardEvent ) => void ) => {
	useEffect( () => {
		const handler = ( e: KeyboardEvent ) => {
			if( e.key === 'Enter' && e.ctrlKey ) {
				fn( document.activeElement , e );
			}
		};
		window.addEventListener( 'keydown' , handler );
		return () => {
			window.removeEventListener( 'keydown' , handler );
		};
	} , [ fn ] );
};
