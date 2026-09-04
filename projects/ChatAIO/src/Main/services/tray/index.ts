/**
 * Tray Service
 * 管理系统托盘图标和菜单
 */

let trayInstance: Tray | null = null;
let i18nInstance: (() => { i18n: (text: string) => string }) | null = null;

export function setI18nInstance(i18n: () => { i18n: (text: string) => string }) {
	i18nInstance = i18n;
}

const t = (text: string) => {
	return i18nInstance ? i18nInstance().i18n(text) : text;
};

export function initTray(): Tray | null {
	if( trayInstance ) return trayInstance;
	
	const iconImage = loadTrayNativeImage();
	
	// macOS Template Image: 深色菜单栏自动反色，浅色菜单栏保留黑色
	if( process.platform === 'darwin' ) {
		iconImage.setTemplateImage( true );
	}
	trayInstance = new Tray( iconImage );
	trayInstance.setToolTip( 'ChatAIO' );
	
	updateTrayMenu();
	
	// macOS 菜单栏 extra：单击切换窗口显示/隐藏
	// Windows/Linux 系统托盘：双击显示窗口
	if( process.platform === 'darwin' ) {
		trayInstance.on( 'mouse-down' , () => {
			if( mainWindow && !mainWindow.isDestroyed() ) {
				if( mainWindow.isVisible() && !mainWindow.isMinimized() ) {
					mainWindow.hide();
				} else {
					showMainWindow();
				}
			}
		} );
	} else {
		trayInstance.on( 'double-click' , () => {
			showMainWindow();
		} );
	}
	
	return trayInstance;
}

export function updateTrayMenu() {
	if( !trayInstance || trayInstance.isDestroyed() ) return;
	
	const contextMenu = Menu.buildFromTemplate( [
		{
			label : t('Show Window') ,
			click : () => {
				showMainWindow();
			},
		} ,
		{ type : 'separator' } ,
		{
			label : t('Quit') ,
			click : () => {
				/* 必须 destroy 隐藏窗再 exit，不能只 close 主窗。
				   设计：docs/issues/close-without-tray-process-lingers.md */
				( app as any ).__chatAIOQuitting = true;
				destroyTray();
				BrowserWindow.getAllWindows().forEach( win => {
					if( !win.isDestroyed() ) {
						win.destroy();
					}
				} );
				app.exit( 0 );
			},
		},
	] );
	
	trayInstance.setContextMenu( contextMenu );
}

export function destroyTray() {
	if( trayInstance ) {
		trayInstance.destroy();
		trayInstance = null;
	}
}

export function isTrayActive(): boolean {
	return trayInstance !== null && !trayInstance.isDestroyed();
}

/**
 * 根据设置同步 tray 状态
 * @param enabled 是否启用 tray
 */
export function syncTrayState( enabled: boolean ) {
	if( enabled && !isTrayActive() ) {
		initTray();
	} else if( !enabled && isTrayActive() ) {
		destroyTray();
	}
}

import {
	mainWindow ,
	showMainWindow,
} from '#main/mainWindow';
import { loadTrayNativeImage } from '#main/services/app-icons';
import {
	app ,
	BrowserWindow ,
	Menu ,
	Tray,
} from 'electron';
