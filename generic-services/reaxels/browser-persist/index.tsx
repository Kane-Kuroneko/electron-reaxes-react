const keysSet = {};

export const Refaxel_BrowserPersist = function (persistKey:string) {
	
	if(keysSet.hasOwnProperty(persistKey)){
		throw new Error( `Refaxel-Persist ERROR : persist-key冲突,请将<${ persistKey }>修改为另一个不同的persist-key` );
	}else {
		keysSet[persistKey] = true;
	}
	return <T extends {store,setState}>({store,setState}:T) => {
		
		const persistedData = localStorage.getItem( persistKey );
		
		if( persistedData ) {
			setState( JSON.parse(persistedData) );
		}
		
		deepObserve( store , () => {
			const json = JSON.stringify( store );
			localStorage.setItem( persistKey , json );
		} );
	}
	
}

import { deepObserve } from 'mobx-utils';
