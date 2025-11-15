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

contextBridge.exposeInMainWorld( 'IPC' , {
	send( channel,...args ) {
		ipcRenderer.send( channel,...args );
	} ,
	on(channel, listener) {
		return ipcRenderer.on( channel,listener );
	} ,
	invoke(channel,...args){
		return ipcRenderer.invoke( channel,...args );
	},
	info:{
		app_version : version,
	}
} );

import { contextBridge , ipcRenderer ,IpcRenderer} from "electron";
import { version } from '#project/package.json';
