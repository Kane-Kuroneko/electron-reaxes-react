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
	
	const iconPath = nativeImage.createFromPath(
		path.join( app.isPackaged
			? path.dirname( app.getPath( 'exe' ) )
			: path.resolve( __dirname , '../../statics' ) ,
		'gpt.ico' ),
	);
	
	trayInstance = new Tray( iconPath );
	trayInstance.setToolTip( 'AI Web App' );
	
	updateTrayMenu();
	
	trayInstance.on( 'double-click' , () => {
		const win = BrowserWindow.getAllWindows()[0];
		if( win ) {
			win.show();
			win.focus();
		}
	} );
	
	return trayInstance;
}

export function updateTrayMenu() {
	if( !trayInstance || trayInstance.isDestroyed() ) return;
	
	const contextMenu = Menu.buildFromTemplate( [
		{
			label : t('Show Window') ,
			click : () => {
				const win = BrowserWindow.getAllWindows()[0];
				if( win ) {
					win.show();
					win.focus();
				}
			},
		} ,
		{ type : 'separator' } ,
		{
			label : t('Quit') ,
			click : () => {
				app.quit();
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
	app ,
	BrowserWindow ,
	Menu ,
	nativeImage ,
	Tray,
} from 'electron';
import * as path from 'node:path';
