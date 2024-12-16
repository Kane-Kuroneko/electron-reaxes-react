window.addEventListener( 'keydown' , ( event ) => {
	if( event.key === 'F12' ) {
		IPC?.send( 'json' , {
			type : 'shortcut' ,
			data : {
				key : event.key ,
				type : "keydown" ,
			} ,
		} );
	}
} );
