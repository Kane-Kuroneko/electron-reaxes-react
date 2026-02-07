export const useIpcRpc = createIpc<IpcRpc>('rpc');
export const useIpcMainToRenderer = createIpc<MainToRendererEvents>('mtrEvent');
export const useIpcRendererToMain = createIpc<RendererToMainEvents>('rtmEvent');

import { createIpc } from '#generics/toolkit/electron/ipc.main';
import {
	IpcRpc ,
	MainToRendererReply ,
	RendererToMainEvents ,
	MainToRendererEvents,          
} from '#src/Types/IpcSchema';
