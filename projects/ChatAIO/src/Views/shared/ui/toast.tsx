export const toast = {
	success( message:string ) {
		sonnerToast.success( message );
	} ,
	error( message:string ) {
		sonnerToast.error( message );
	} ,
	info( message:string ) {
		sonnerToast.info( message );
	} ,
	warning( message:string ) {
		sonnerToast.warning( message );
	} ,
};

export const AppToaster = ( props:{ theme?: 'light' | 'dark' | 'system' } ) => {
	return <Sonner
		position="top-center"
		richColors
		closeButton
		theme={ props.theme || 'system' }
	/>;
};

import { Toaster as Sonner , toast as sonnerToast } from 'sonner';
