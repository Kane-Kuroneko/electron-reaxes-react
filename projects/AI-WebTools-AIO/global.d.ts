


declare global {
	interface Window {
		IPC: typeof IPC;
	}
	const IPC: {
		invoke : typeof ipcRenderer.invoke;
		send : typeof ipcRenderer.send;
		on : typeof ipcRenderer.on;
	};
	
}

export {};

import {ipcRenderer,} from 'electron';
