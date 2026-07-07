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
	
	const staticsDir = app.isPackaged
		? path.join( process.resourcesPath , 'statics' )
		: path.join( app.getAppPath() , 'statics' );
	const iconPath = nativeImage.createFromPath(
		path.join( staticsDir , process.platform === 'darwin' ? 'tray-icon.macos.png' : 'gpt.ico' ),
	);
	
	// macOS Template Image: 深色菜单栏自动反色，浅色菜单栏保留黑色
	if( process.platform === 'darwin' ) {
		iconPath.setTemplateImage( true );
	}
	trayInstance = new Tray( iconPath );
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
import {
	app ,
	BrowserWindow ,
	Menu ,
	nativeImage ,
	Tray,
} from 'electron';
import * as path from 'node:path';
