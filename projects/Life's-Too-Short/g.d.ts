declare global {
	
	export const versions: {
		node: string,
		chrome: string,
		electron: string,
	};
	
	type IpcRenderer = import('electron/renderer').IpcRenderer;
	type IpcRendererEvent = import('electron/renderer').IpcRendererEvent;
	type IpcJsonHandle = import('#src/IPC-channels').IpcJsonHandle;
	type IpcJsonOn = import('#src/IPC-channels').IpcJsonOn;
	
	type Channel = "console" | "json::handle"|"json::on";
	type ChannelConsoleType = any[];
	// type ChannelJsonType<T extends keyof IpcJsonHandle> = IpcJsonHandle[T]["args"];
	
	type Args<
		C extends Channel,
		D extends Record<string, { data: unknown }>,
		R extends keyof D
	> = {
		console: ChannelConsoleType;
		"json::handle": [
			{ type: R; data: D[R]["data"] }
		];
		"json::on": [
			{ type: R; data: D[R]["data"] }
		];
	}[C];
	
	export const IPC: {
		invoke<
			C extends Channel,
			R extends keyof IpcJsonHandle
		>(
			channel: C,
			...args: Args<C, IpcJsonHandle, R>
		): R extends keyof IpcJsonHandle
			? IpcJsonHandle[R]["reply"] extends Promise<unknown>
				? IpcJsonHandle[R]["reply"]
				: Promise<IpcJsonHandle[R]["reply"]>
			: never;
		
		send<C extends Channel , R extends keyof IpcJsonOn>( channel: C , ...args: Args<C,IpcJsonOn , R> ): void,
		
		on<C extends Channel , T extends keyof IpcJsonOn>( channel: C , callback: ( e: IpcRendererEvent , ...args:Args<C , IpcJsonOn , T> ) => void ) : ReturnType<IpcRenderer['on']>,
		
		info : {
			app_version : string|number;
			
		}
	};
	
	
	interface Window {
		versions: typeof versions;
		IPC: typeof IPC;
	}
	
	export const I18n: typeof import('#renderer/reaxels/exports')['I18n'];
	export const i18n: typeof import('#renderer/reaxels/exports')['i18n'];
	
	export const IPCLogger: typeof import('#main/utils/devtools-logger')['IPCLogger'];
	export const __NODE_ENV__ : "development"|"production";
	export const __IS_MOCK__: boolean;
	export const __DEV_PORT__: number;
	export const __EXPERIMENTAL__: boolean;
	export const __METHOD__: "server"|"build";
}
export {};
