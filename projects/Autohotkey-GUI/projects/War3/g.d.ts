

declare global {
	export const versions : {
		node : string,
		chrome : string,
		electron : string,
	}
	
	type 
	export const IPC : {
		send : import('electron').IpcRenderer['send'],
		on : import('electron').IpcRenderer['on'],
	}
	
	
	interface Window {
		versions : typeof versions;
		IPC : typeof IPC;
	}
	export const I18n : typeof import('#reaxels/exports')['I18n'];
	export const i18n : typeof import('#reaxels/exports')['i18n'];
}

export {}
