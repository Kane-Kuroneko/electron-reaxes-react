const { absAppRunningPath } = reaxel_ElectronENV();

export let mainWindow:BrowserWindow = null;

const getLogicalResolution = (
	baseLogicalWidth = 1600,
	baseLogicalHeight = 900,
	position?:Rectangle,
) => {
	const targetDisplay = position
		? screen.getDisplayNearestPoint( position )
		: screen.getPrimaryDisplay();
	const workArea = targetDisplay.workAreaSize;
	const logicalWidth = Math.min( baseLogicalWidth , Math.floor( workArea.width * 0.75 ) );
	const logicalHeight = Math.min( baseLogicalHeight , Math.floor( workArea.height * 0.75 ) );
	return {
		width : Math.max( 1024 , logicalWidth ) ,
		height : Math.max( 600 , logicalHeight ),
	};
};

export const createMainWindow = async() => {
	if( mainWindow && !mainWindow.isDestroyed() ) {
		return mainWindow;
	}
	await app.whenReady();
	const { width , height } = getLogicalResolution();
	const defaultOptions:BrowserWindowConstructorOptions = {
		width : dev() ? width : 1280 ,
		height : dev() ? height : 720 ,
		webPreferences : {
			nodeIntegration : false ,
			contextIsolation : true ,
			preload : path.join( absAppRunningPath , 'preload.js' ),
		},
		// macOS 标题栏：隐藏原生标题栏，使用 trafficLightPosition 精确控制红绿灯位置
		// hiddenInset 有已知 bug（死区、拖拽失效），hidden + trafficLightPosition 是社区推荐方案
		...( process.platform === 'darwin' && {
			titleBarStyle : 'hidden' as const,
			trafficLightPosition : { x : 12 , y : 22 } as const,
		} ),
	};
	
	mainWindow = new BrowserWindow( _.merge( {} , defaultOptions ) );
	mainWindow.on( 'closed' , () => {
		mainWindow = null;
	} );

	// macOS: 加载极简 HTML shell，仅在标题栏区域提供原生窗口拖拽能力
	// 红绿灯按钮区域本身不响应拖拽（自 Electron v1.1.1），需通过 CSS -webkit-app-region: drag 声明
	// Child WebContentsViews 渲染于 contentView 上层，不会被此 HTML 影响
	if( process.platform === 'darwin' ) {
		const dragShellHTML = `<!doctype html>
<html>
<head><meta charset="UTF-8">
<style>
	html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden}
	.titlebar-drag{-webkit-app-region:drag;app-region:drag;height:38px;width:100%;position:fixed;top:0;left:0;z-index:9999}
</style></head>
<body><div class="titlebar-drag"></div></body>
</html>`;
		mainWindow.loadURL( `data:text/html;base64,${ Buffer.from( dragShellHTML , 'utf-8' ).toString( 'base64' ) }` );
	}

	return mainWindow;
};

export const showMainWindow = () => {
	if( !mainWindow || mainWindow.isDestroyed() ) {
		return null;
	}
	if( mainWindow.isMinimized() ) {
		mainWindow.restore();
	}
	if( !mainWindow.isVisible() ) {
		mainWindow.show();
	}
	mainWindow.focus();
	mainWindow.moveTop();
	return mainWindow;
};

import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import { dev } from 'electron-is';
import {
	app ,
	BrowserWindow ,
	type BrowserWindowConstructorOptions ,
	screen ,
	type Rectangle,
} from 'electron';
import _ from 'lodash';
import * as path from 'node:path';
