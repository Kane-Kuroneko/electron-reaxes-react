const logger = await getLogger();

export const reaxel_Logger = reaxel( () => {
	
	const { store , setState , mutate } = orzMobx( {
		logger ,
		
	} );
	const ret = {
		get logger(){
			return store.logger;
		}
	};
	return () => {
		
		return ret;
	};
} );

async function getLogger () {
	if(main()){
		return (await import('electron-log/main')).default;
	}else if(renderer()){
		return (await import('electron-log/renderer')).default;
	}else {
		return null;
	}
}

import {main,renderer} from 'electron-is';
import type {Logger} from 'electron-log';
