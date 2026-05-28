/**
 * Tray Service
 * 管理系统托盘图标和菜单
 */

let trayInstance: Tray | null = null;

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
	
	const contextMenu = Menu.buildFromTemplate( [
		{
			label : 'Show Window' ,
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
			label : 'Quit' ,
			click : () => {
				app.quit();
			},
		},
	] );
	
	trayInstance.setContextMenu( contextMenu );
	
	trayInstance.on( 'double-click' , () => {
		const win = BrowserWindow.getAllWindows()[0];
		if( win ) {
			win.show();
			win.focus();
		}
	} );
	
	return trayInstance;
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
