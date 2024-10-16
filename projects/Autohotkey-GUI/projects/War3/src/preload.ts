import { contextBridge , ipcRenderer ,} from "electron";

contextBridge.exposeInMainWorld( 'versions' , {
	get node() {
		return process.versions.node;
	} ,
	get chrome() {
		return process.versions.chrome;
	} ,
	get electron() {
		return process.versions.electron;
	} ,
} );
function flatProto(obj) {
	const result = {};
	
	function deepDiveProto( obj = result ) {
		const prototype = Object.getPrototypeOf( obj );
		if( prototype !== Object.prototype ) {
			deepDiveProto( prototype )
		}
		Object.assign( result , prototype );
	}
	
	deepDiveProto( obj );
	return result;
}

const json = JSON.stringify( flatProto( ipcRenderer ) , (k,v) => {
	if(typeof v === 'function'){
		return `function ${k}()`;
	}else return v;
} , 3 );

const ipcRendererDeepCopy = flatProto( ipcRenderer );
// ipcRendererDeepCopy.send('test',{a:1,v:2323})
contextBridge.exposeInMainWorld( '_Danger_Native_IpcRenderer_' , function (){
	return json;
}() );

contextBridge.exposeInMainWorld( 'ipcAPI' , {
	ipcRenderer : () => ipcRenderer.send( 'test' , { a : 'aaaaa' } ),
	
} );

import purdy from 'purdy';
