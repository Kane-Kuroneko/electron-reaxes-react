

declare global {
	export const IPC : {
		send : import('electron').IpcRenderer['send'],
		on : import('electron').IpcRenderer['on'],
	}
	
	export const I18n : typeof import('#reaxels/exports')['I18n'];
	export const i18n : typeof import('#reaxels/exports')['i18n'];
}

export {}
