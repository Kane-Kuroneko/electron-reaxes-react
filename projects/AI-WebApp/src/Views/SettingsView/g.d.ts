declare global{
	const IPC: {
		invoke : typeof ipcRenderer.invoke;
		send : typeof ipcRenderer.send;
		on : typeof ipcRenderer.on;
	};
	export const api : {
		getSettings: () => Promise<{
			proxy: {
				enabled: boolean;
				address: string;
				type: string;
				port: number;
				hostname: string;
				no_proxy_for: string[];
				proxy_auth: {
					enabled: boolean;
					username: string;
					password: string;
				};
			}
		}>;
		setSettings: (settings: {
			proxy: {
				enabled: boolean;
				address: string;
				type: string;
				port: number;
				hostname: string;
				no_proxy_for: string[];
				proxy_auth: {
					enabled: boolean;
					username: string;
					password: string;
				};
			}
		}) => Promise<void>;
		exitSettings: () => Promise<void>;
		
	}
}

export {}


import {ipcRenderer,} from 'electron';
