/**
 * @template HandleChannels IPC Handle类型定义（request-reply模式）
 * @template OnChannels IPC On类型定义（单向发送模式）
 * @param options 配置选项
 * @returns IPC实例，包含ipcHandle、ipcOn、useIpcSend方法
 */
export const createElectronIPC = <
	HandleChannels extends Record<string, IpcStructure.IpcRpc<any[] , any>> = {},
	OnChannels extends Record<string, IpcStructure.RendererToMainEvent<any[],any[]>> = {}
>(options?: {
	handleChannelName?: string;
	onChannelName?: string;
}) => {
	const HANDLE_CHANNEL = options?.handleChannelName ?? 'json::handle';
	const ON_CHANNEL = options?.onChannelName ?? 'json::on';

	/**
	 * IPC Handle（双向通信）
	 */
	const ipcHandle = (() => {
		type HandleChannelsKey = string&keyof HandleChannels;
		const registry: {
			[K in HandleChannelsKey]?: (
				e: IpcMainInvokeEvent,
				...payloads: HandleChannels[K]['payloads']
			) => HandleChannels[K]['response'] | Promise<HandleChannels[K]['response']>;
		} = {};

		const proxifier = <T extends HandleChannelsKey>(
			e: IpcMainInvokeEvent,
			meta:Meta<T>,
			...payloads:HandleChannels[T]['response']
		) => {

			const cb = registry[meta.type];
			if (cb) {
				return cb(e,  ...payloads);
			} else {
				console.error(`No handler registered for type: ${String(meta.type)}`);
				return { error: `Handler not found for type: ${String(meta.type)}` };
			}
		};

		ipcMain.handle(HANDLE_CHANNEL, proxifier);

		return <T extends HandleChannelsKey>(type: T) => ({
			handle(
				cb: (
					e: IpcMainInvokeEvent,
					...payloads: HandleChannels[T]['response']
				) => HandleChannels[T]['response'] | Promise<HandleChannels[T]['response']>
			) {
				registry[type] = cb;
			},
		});
	})();

	/**
	 * IPC On（单向通信）
	 */
	type OnChannelsKey = string&keyof OnChannels;
	const ipcOn = (() => {
		type Reply = <T extends OnChannelsKey>(type:T) => {send(...args: OnChannels[T]['reply']):void} 

		const registry: {
			[K in keyof OnChannels]?: (
				e:{event: IpcMainEvent,reply: Reply},
				...args: OnChannels[K]['args']
			) => void;
		} = {};

		const proxifier = <T extends OnChannelsKey>(
			event: IpcMainEvent,
			meta:Meta<T>,
			...args: OnChannels[T]['args']
		) => {
			const reply = <T extends OnChannelsKey>(type: T) => ({
				send(...args){event.reply(ON_CHANNEL, {type},...args);}
			});
			const cb = registry[meta.type];
			if (cb) {
				return cb({event,reply}, ...args);
			} else {
				console.error(`No handler registered for type: ${String(meta.type)}`);
				return { error: `Handler not found for type: ${String(meta.type)}` };
			}
		};

		ipcMain.on(ON_CHANNEL, proxifier);

		return <T extends OnChannelsKey>(type: T) => ({
			on(cb: (
				e: { event:IpcMainEvent, reply: Reply },
					...args: OnChannels[T]['args']
			) => void
			): void {
				registry[type] = cb as any;
			},
		});
	})();

	/**
	 * 发送IPC消息到特定窗口
	 */
	const useIpcSend = (window: BrowserWindow) => {
		if (!window) {
			throw new Error('useIpcSend: window不存在');
		}
		return <T extends OnChannelsKey>(type: T) => ({
			send(...args: OnChannels[T]['args']) {
				window.webContents.send(ON_CHANNEL, {type},...args);
			},
		});
	};

	return {
		ipcHandle,
		ipcOn,
		useIpcSend,
	};
};

type Meta<Type extends string,> = {
	type : Type;
	
}

const {} = createElectronIPC();

import { ipcMain, IpcMainInvokeEvent, IpcMainEvent, BrowserWindow } from 'electron';
import { IpcStructure } from './IpcStructure';
