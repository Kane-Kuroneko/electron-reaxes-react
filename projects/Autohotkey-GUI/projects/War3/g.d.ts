

declare global {
	export const IPC : {
		send : import('electron').IpcRenderer['send'],
		on : import('electron').IpcRenderer['on'],
	}
}

export {}
