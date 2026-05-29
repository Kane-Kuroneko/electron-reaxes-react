// When-Ready: app.whenReady()后的异步逻辑


app.whenReady().then(async () => {
	const win = mainWindow;
	
	// 美化开发工具
	useBeautifulDevtool(win);
	
	// 初始化设置、菜单、国际化
	reaxel_Settings();
	reaxel_I18n();
	
	console.log('[when-ready] Setting i18n instance on Menu and Tray...');
	// 设置 Menu 和 Tray 的 i18n 实例
	// 注意: 传递 reaxel_I18n (可调用的 reaxel 引用, 即 () => rtn)
	// 因为 t() 函数内部通过 i18nInstance().i18n(text) 调用
	reaxel_Menu().setI18nInstance(reaxel_I18n);
	setTrayI18nInstance(reaxel_I18n);
	
	// 重建菜单以应用正确的语言
	// 因为 Menu factory 的 app.whenReady().then(rebuildMenu) 先于此处执行，
	// 那时 i18nInstance 还是 null，所以菜单是英文的。
	// 现在 i18n 已设置，需要重建一次。
	console.log('[when-ready] Rebuilding menu with i18n...');
	reaxel_Menu().rebuildMenu();
	
	// 监听渲染进程语言变更
	useIpcRendererToMain('language-change').on((e, language) => {
		console.log('[when-ready] language-change IPC received:', language);
		reaxel_I18n().setLanguage(language as any);
		// 立即持久化语言设置，确保重启后生效
		const svc = getSettingsConfigService();
		const current = svc.getEffectiveSettings();
		console.log('[when-ready] Persisting language to settings:', language);
		svc.saveSettings({ ...current, appearance: { ...current.appearance, language } });
		// 重建菜单以应用新语言
		reaxel_Menu().rebuildMenu();
		// 更新托盘菜单
		if( isTrayActive() ) {
			updateTrayMenu();
		}
	});
	
	// 初始化系统托盘
	const settings = getSettingsConfigService().getEffectiveSettings();
	if( settings.system.tray ) {
		initTray();
	}
	
	// 托盘模式：关闭窗口时最小化到托盘而非退出
	win.on( 'close' , ( event ) => {
		if( isTrayActive() ) {
			event.preventDefault();
			win.hide();
		}
	} );
	
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
import { reaxel_I18n } from '#main/reaxels/I18n';
import { Reaxel_View } from "#main/reaxels/Views";
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import { initTray , isTrayActive , updateTrayMenu , setI18nInstance as setTrayI18nInstance } from '#main/services/tray';
import { useIpcRendererToMain } from '#main/services/ipc';
