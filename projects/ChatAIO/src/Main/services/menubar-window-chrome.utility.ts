/**
 * Windows menubar 窗口铬层（backgroundColor + titleBarOverlay + 主壳 View 底色）单一入口。
 *
 * 启动色差根因：首帧三层底色不一致——
 * 1) BrowserWindow.backgroundColor（HTML 未绘时露出）
 * 2) titleBarOverlay.color（原生 min/max/close 区）
 * 3) MainView CSS --menu-view-bg（自定义栏）
 *
 * 必须在 BrowserWindow 构造时就写入正确主题色，并在主题切换时走本函数同步三层。
 * macOS 主壳保持透明，不在此改 backgroundColor。
 */

export const applyMenubarWindowChrome = (
	win : BrowserWindow ,
	theme : 'light' | 'dark',
): void => {
	if( !win || win.isDestroyed() ) return;
	if( process.platform === 'darwin' ) return;

	const chrome = getMenubarTitleBarOverlayOptions( theme );
	try {
		win.setBackgroundColor( chrome.color );
	} catch ( error ) {
		console.warn( '[MenubarChrome] setBackgroundColor failed:' , error );
	}
	try {
		win.setTitleBarOverlay( chrome );
	} catch ( error ) {
		console.warn( '[MenubarChrome] setTitleBarOverlay failed:' , error );
	}
	applyMainShellBackgroundColor( win , chrome.color );
};


import { getMenubarTitleBarOverlayOptions } from '#src/shared/menubar-geometry';
import { applyMainShellBackgroundColor } from '#main/services/clip-main-shell-to-menubar.utility';
import type { BrowserWindow } from 'electron';
import process from 'node:process';
