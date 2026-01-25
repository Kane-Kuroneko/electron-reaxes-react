export namespace IpcStructure {
	//ipcRenderer.send(channel,...payloads)
	export type RendererToMainEvent<Args extends any[],Reply extends any[] = []> = {
		args : Args,
		reply : Reply,
	}
	//webContents.send(channel,...payloads)
	export type MainToRendererEvent<Args extends any[],Reply extends any[] = []> = {
		args : Args,
		reply : Reply,
	}
	//ipcRenderer.invoke(channel,...payloads);
	export type IpcRpc<Payloads extends any[],Response> = {
		payloads : Payloads,
		response : Response,
	}
}
