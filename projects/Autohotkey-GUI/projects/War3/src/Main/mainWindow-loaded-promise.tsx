export const mainWindowLoaded = orzPromise<BrowserWindowWithoutWebContents & {
	webContents: CustomWebContents;
}>();

// 定义自定义的 webContents 类型，剔除掉 send 和 on 方法
type CustomWebContents = Omit<WebContents, 'send' | 'on'> & {
	send<T extends keyof Channel>(
		channel: T,
		data?: IPCChannels[T] extends any
			? any // 如果该通道类型是 any，data 就是 any
			: { type: keyof IPCChannels[T]; data: IPCChannels[T][keyof IPCChannels[T]] } | null
	): void;
	
	on : WebContents['on'] & (<T extends keyof Channel>(
		channel: T,
		callback: (e: IpcRendererEvent, data: IPCChannels[T] extends any
			? any // 如果该通道类型是 any，data 就是 any
			: ExtractData<IPCChannels[T]>) => void
	) => void) ;
	
};
// 使用 Omit 将 BrowserWindow 类型中的 webContents 排除
type BrowserWindowWithoutWebContents = Omit<BrowserWindow, 'webContents'>;
import type { IPCChannels } from '#reaxels/IPC-interfaces/channels';
import { BrowserWindow , WebContents } from 'electron';
