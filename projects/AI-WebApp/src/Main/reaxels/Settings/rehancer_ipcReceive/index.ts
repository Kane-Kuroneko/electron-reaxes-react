/**
 * @description Settings Reaxel 的 IPC 接收增强器
 * 用于处理来自渲染进程的 IPC 消息接收逻辑
 * 
 * @example
 * rehancer_ipcReceive({store, setState, mutate})();
 */
export const rehancer_ipcReceive = ({store, setState, mutate}: Pick<Reaxel_Settings, 'store' | 'setState' | 'mutate'>) => () => {
	
	// 设置 IPC handle 处理器
	// ipcMain.handle('channel-name', async (event, ...args) => {
	//	 // 处理逻辑
	//	 return result;
	// });
	
	// 设置 IPC on 事件监听器
	// ipcMain.on('channel-name', (event, ...args) => {
	//	 // 处理逻辑
	// });
	
}

import { ipcMain } from 'electron';
import type { Reaxel_Settings } from '../index';
