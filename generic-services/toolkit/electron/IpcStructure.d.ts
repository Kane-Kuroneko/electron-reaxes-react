export namespace IpcStructure {
	//ipcRenderer.send(channel,...payloads)
	export type RendererToMainEvent<Args extends unknown[],Reply extends {channel:unknown,args:unknown[]}> = {
		args : Args,
		reply : Reply,
	}
	//webContents.send(channel,...payloads)
	export type MainToRendererEvent<Args extends unknown[]> = {
		args : Args
	}
	//ipcRenderer.invoke(channel,...payloads);
	export type IpcRpc<Payloads extends unknown[],Response> = {
		payloads : Payloads,
		response : Response,
	}
}

export type ReplyFromMtrEvents<MtrEvents extends Record<string , IpcStructure.MainToRendererEvent<unknown[]>>,Channel extends keyof MtrEvents> = {
	channel: Channel;
	args: MtrEvents[Channel]["args"];
}
