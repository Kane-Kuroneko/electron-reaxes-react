import { contextBridge , ipcRenderer ,IpcRenderer,} from "electron";

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
	send(...args:Parameters<IpcRenderer['send']>){
		return ipcRenderer.send(...args);
	},
	on( ...args: Parameters<IpcRenderer['on']> ) {
		return ipcRenderer.on( ...args );
	},
} );
