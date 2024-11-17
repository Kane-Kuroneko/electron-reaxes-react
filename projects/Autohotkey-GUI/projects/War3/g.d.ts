

declare global {
	export const versions : {
		node : string,
		chrome : string,
		electron : string,
	}
	
	type Channel = import('./src/reaxels/IPC-interfaces/channels').IPCChannels;
	type IpcRendererEvent = import('electron/renderer').IpcRenderer;
	export const IPC : {
		send <T extends keyof Channel>(channel:T ,data:{type:keyof Channel[T] , data : Channel[T][keyof Channel[T]]}) : void ,
		
		on<T extends keyof Channel>(channel:T,callback:(e:IpcRendererEvent,data:ExtractData<Channel[T]>) => void):void,
	}
	
	
	interface Window {
		versions : typeof versions;
		IPC : typeof IPC;
	}
	export const I18n : typeof import('#reaxels/exports')['I18n'];
	export const i18n : typeof import('#reaxels/exports')['i18n'];
}

export {}
