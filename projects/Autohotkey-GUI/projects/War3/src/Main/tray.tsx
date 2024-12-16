const { absAppStaticsPath } = reaxel_ElectronENV();

app.whenReady().then( () => {
	
	const trayIconPath = path.join( absAppStaticsPath , 'assets/ico/logo - mixin.ico' );
	const contextMenu = Menu.buildFromTemplate( [
		{
			label : '显示魔兽reaxes助手' ,
			async click() {
				
				const win = await mainWindowLoaded;
				win.show();
				console.log( '打开应用' );
				// 在这里处理打开应用的逻辑（例如打开窗口）
			} ,
		} ,
		{
			label : '退出' ,
			async click() {
				appQuitHook = () => {
					appQuitHook = () => false;
					return true;
				}
				app.quit();
			} ,
		} ,
	] );
	const tray = new Tray( trayIconPath );
	
	tray.setContextMenu( contextMenu );
	
	tray.setToolTip( '魔兽reaxes助手' );
	
	tray.on( 'click' , async() => {
		const win = await mainWindowLoaded;
		win.show();
	} );
	
} );

export let appQuitHook = () => false;

import { mainWindowLoaded } from '#project/src/Main/mainWindow-loaded-promise';
import { reaxel_ElectronENV } from '#reaxels/env';
import { Tray , Menu , app } from 'electron';
import path from 'node:path';
