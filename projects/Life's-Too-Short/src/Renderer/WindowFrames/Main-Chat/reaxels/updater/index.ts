export const reaxel_Updater = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate ,
	} = createReaxable( {
		checking : false ,
	} );
	
	const rtn = {
		async checkForUpdates() {
			if( store.checking ) {
				return;
			}
			setState( { checking : true } );
			const { result } = await (
				IpcRendererInvoke( 'check-app-updates' ).invoke( {} )
			);
			console.log( 'update result:' , result );
			setState( { checking : false } );
		},
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

import { IpcRendererInvoke } from '#renderer/utils/useIPC';
