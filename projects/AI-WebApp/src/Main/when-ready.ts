// When-Ready: app.whenReady()后的异步逻辑


app.whenReady().then(async () => {
	const win = mainWindow;
	
	// 美化开发工具
	useBeautifulDevtool(win);
	
	// 设置代理
	const proxyRules = 'http=127.0.0.1:7897;https=127.0.0.1:7897';
	const ses = win.webContents.session;
	await ses.setProxy({ proxyRules });
	
	// 初始化设置和菜单
	reaxel_Settings();
	reaxel_Menu();
	
	// 打开开发设置视图
	useDevSettingsView();
	
	// 获取主显示器信息
	const primaryDisplay = screen.getPrimaryDisplay();
	const scaleFactor = primaryDisplay.scaleFactor;
	
	return win;
}).catch(e => {
	console.error('App whenReady initialization failed:', e);
});

/**
 * 使用开发设置视图
 */
function useDevSettingsView() {
	Reaxel_View.setState({ settingsViewOpened: true });
	const settingsView = reaxel_SettingsView().initSettingsView();
	settingsView.setVisible(true);
	mainWindow.contentView.addChildView(settingsView);
	settingsView.webContents.openDevTools();
}

import { app, screen } from 'electron';
import { mainWindow } from './mainWindow';
import { useBeautifulDevtool } from '#generics/modify-electron/beautiful-devtool';
import { reaxel_Settings } from "#main/reaxels/Settings";
import { reaxel_Menu } from './reaxels/Menu';
import { Reaxel_View } from "#main/reaxels/Views";
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
