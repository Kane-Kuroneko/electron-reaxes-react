if(isElectron){
	var { IPC } = await import('#renderer/ENV/electron')
}


IPC?.on( 'console' , ( e , ...data ) => {
	console.log( ...data );
} );


IpcRendererOn( 'clear-localstorage' ).on( ( e , data ) => {
	localStorage.clear();
	location.reload();
} );


IpcRendererInvoke('screen-info').invoke({type:'primary'}).then(( { primaryScreen }) => {
	const physicalSize : Size = {
		height : primaryScreen.size.height * primaryScreen.scaleFactor,
		width : primaryScreen.size.width * primaryScreen.scaleFactor,
	}
	
}).catch(e => {
	console.error('dddddddddddd,',e);
} )
import type { Size } from 'electron';
import {
	IpcRendererInvoke ,
	IpcRendererOn,
} from '#renderer/utils/useIPC';

import { isElectron } from '#renderer/ENV';
