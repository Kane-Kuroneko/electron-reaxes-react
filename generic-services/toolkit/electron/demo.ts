type MainToRendererEvents = {
	'settings-changed' : IpcStructure.MainToRendererEvent<[{proxy:{method:'Http'|'Socks5'}}]>;
}

type RendererToMainEvents = {
	'get-settings' : IpcStructure.RendererToMainEvent<['proxy'|'appearance'],MainToRendererReply<'settings-changed'>>;
}

type IpcRpc = {
	'update-settings' : IpcStructure.IpcRpc<[{proxy:{}}],{merged:boolean}>;
}

type MainToRendererReply<K extends keyof MainToRendererEvents> = ReplyFromMtrEvents<MainToRendererEvents , K>;


const useRtmEvent = createIpc<RendererToMainEvents>('rtmEvent');
const useMtrEvent = createIpc<MainToRendererEvents>('mtrEvent');
const useRpc = createIpc<IpcRpc>('rpc');

useRtmEvent('get-settings').on(({event,reply},settings) => {
	reply('settings-changed').send({proxy:{method}})
})


import { IpcStructure ,ReplyFromMtrEvents} from './IpcStructure';
import { createIpc } from './ipc.main.ts';
