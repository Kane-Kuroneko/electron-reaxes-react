/**
 * Electron IPC 通信工具库
 * 
 * 提供类型安全、零硬编码的 IPC 通信系统
 * 同时支持主进程和渲染进程
 */

export { createElectronIPC } from './ipc.main';


/**
 * 使用示例：
 * 
 * // 主进程
 * import { createElectronIPC } from '@/toolkit/electron';
 * 
 * type HandleChannels = {
 *   'clipboard': { data: {...}; reply: ... }
 * };
 * 
 * type OnChannels = {
 *   'open-url': { data: string }
 * };
 * 
 * const { ipcHandle, ipcOn, useIpcSend } = createElectronIPC<
 *   HandleChannels,
 *   OnChannels
 * >();
 * 
 * // 渲染进程
 * import { createRendererIPC } from '@/toolkit/electron';
 * 
 * const { invoke, send, on, once } = createRendererIPC<
 *   HandleChannels,
 *   OnChannels
 * >();
 */

