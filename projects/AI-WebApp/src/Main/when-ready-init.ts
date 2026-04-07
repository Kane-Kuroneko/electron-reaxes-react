import { Tray, Menu } from 'electron';
import { mainWindow } from './mainWindow';

export function whenReadyInitTray() {
	// 托盘初始化逻辑
	// 这里可以根据实际需求完善
	const tray = new Tray('icon.png');
	const contextMenu = Menu.buildFromTemplate([
		{ label: 'Show', click: () => mainWindow.show() },
		{ label: 'Quit', role: 'quit' }
	]);
	tray.setToolTip('AI Web App');
	tray.setContextMenu(contextMenu);
}

export function whenReadyInitMainWindow() {
	// 主窗口初始化逻辑
	mainWindow.show();
}
