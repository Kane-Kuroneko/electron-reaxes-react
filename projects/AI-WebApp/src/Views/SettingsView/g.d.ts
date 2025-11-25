declare global{
	export const IPC: {
		invoke : typeof ipcRenderer.invoke;
		send : typeof ipcRenderer.send;
		on : typeof ipcRenderer.on;
	};
	export const api : API;
}

export {}


import {ipcRenderer,} from 'electron';
import {type API} from '../../preload';
