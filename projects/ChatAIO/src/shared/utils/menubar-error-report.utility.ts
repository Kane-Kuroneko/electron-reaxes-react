export type MenubarRendererErrorSource = 'main-view-renderer' | 'dropdown-view-renderer';

export const reportMenubarRendererError = (
	scope : string ,
	error : unknown ,
	source : MenubarRendererErrorSource ,
	context? : Record<string , unknown> ,
) => {
	const message = error instanceof Error ? error.message : String( error );
	const stack = error instanceof Error ? error.stack : undefined;
	const contextText = context ? JSON.stringify( context ) : undefined;

	console.error( `[Menubar:${ source }] ${ scope }: ${ message }` , context || '' );
	if( stack ) {
		console.error( stack );
	}

	if( typeof window === 'undefined' ) {
		return;
	}

	const rendererApi = ( window as Window & { api? : API } ).api;
	if( !rendererApi?.reportMenubarError ) {
		return;
	}

	try {
		rendererApi.reportMenubarError( {
			scope ,
			message ,
			stack ,
			context : contextText ,
			source ,
		} );
	} catch ( reportError ) {
		console.error( '[Menubar] Failed to report error to main process:' , reportError );
	}
};


import type { API } from '#src/preload';

export const installMenubarRendererErrorHandlers = ( source : MenubarRendererErrorSource ) => {
	if( typeof window === 'undefined' ) {
		return () => {};
	}

	const handleError = ( event : ErrorEvent ) => {
		reportMenubarRendererError( 'window.error' , event.error || event.message , source , {
			filename : event.filename ,
			lineno : event.lineno ,
			colno : event.colno ,
		} );
	};

	const handleRejection = ( event : PromiseRejectionEvent ) => {
		reportMenubarRendererError( 'unhandledrejection' , event.reason , source );
	};

	window.addEventListener( 'error' , handleError );
	window.addEventListener( 'unhandledrejection' , handleRejection );

	return () => {
		window.removeEventListener( 'error' , handleError );
		window.removeEventListener( 'unhandledrejection' , handleRejection );
	};
};
