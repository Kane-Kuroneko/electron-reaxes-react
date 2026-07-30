/**
 * MainView Dropdown 的跨路径 dismiss 总线。
 * mac 上 Dropdown 以 showInactive 打开，点原生 Application Menu 不会触发
 * BrowserWindow blur / before-mouse-event，需订阅 NSMenuDidBeginTrackingNotification。
 */
let dismissDropdownHandler:( () => void ) | null = null;
let darwinNativeMenuDismissRegistered = false;

export const setMenubarDropdownDismissHandler = ( handler:( () => void ) | null ) => {
	dismissDropdownHandler = handler;
};

export const dismissMenubarDropdownIfOpen = () => {
	dismissDropdownHandler?.();
};

/**
 * darwin：原生菜单开始 tracking 时收起自定义 Dropdown。
 * 须用 subscribeLocalNotification（NSNotificationCenter），
 * 不是 subscribeNotification（NSDistributedNotificationCenter）。
 */
export const registerDarwinNativeMenuDismiss = () => {
	if( process.platform !== 'darwin' || darwinNativeMenuDismissRegistered ) {
		return;
	}
	darwinNativeMenuDismissRegistered = true;
	systemPreferences.subscribeLocalNotification(
		'NSMenuDidBeginTrackingNotification' ,
		() => {
			dismissMenubarDropdownIfOpen();
		} ,
	);
};

import { systemPreferences } from 'electron';
