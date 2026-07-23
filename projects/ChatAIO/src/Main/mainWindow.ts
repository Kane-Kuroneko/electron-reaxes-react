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
			/* macOS: transparent FloatingView overlay must not throttle menubar / AI views (electron#51718). */
			...( process.platform === 'darwin' && {
				backgroundThrottling : false ,
			} ),
		},
		// macOS 标题栏：hidden + trafficLightPosition（勿用 hiddenInset：死区/拖拽失效）
		// 几何见 shared/menubar-geometry.ts：红绿灯与菜单控件共垂直中心
		...( process.platform === 'darwin' && {
			titleBarStyle : 'hidden' as const,
			trafficLightPosition : getTrafficLightPosition(),
		} ),
		// Windows/Linux：隐藏原生标题栏，使用 titleBarOverlay 保留窗口操作按钮
		...( process.platform !== 'darwin' && {
			titleBarStyle : 'hidden' as const,
			titleBarOverlay : {
				color : '#00000000' ,
				symbolColor : '#888888' ,
				height : getMenuBarHeight(),
			} as any,
		} ),
	};
	
	mainWindow = new BrowserWindow( _.merge( {} , defaultOptions ) );

	// macOS: 主 webContents 仅承载 menubar；透明底色避免 AI WCV 未重绘时露出灰白壳层
	if( process.platform === 'darwin' ) {
		mainWindow.setBackgroundColor( '#00000000' );
	}

	/*
	 * MainView（menubar）loadURL 前，调用方必须已执行
	 * reaxel_MainView().ensureMenubarHostReady()（见 runtime.ts Phase 0）。
	 * Electron 约定：ipcMain handler 注册先于 renderer 导航。
	 */
	loadMainViewHTML();

	/* 主壳 View 裁到 menubar：避免全窗 drag provider 叠进内容区（electron#41002） */
	bindMainShellMenuBarClip( mainWindow );

	mainWindow.on( 'closed' , () => {
		mainWindow = null;
	} );

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

/**
 * 加载 MainView HTML 到 mainWindow（含 MenuBar 等全局组件）
 */
const loadMainViewHTML = () => {
	if( !mainWindow || mainWindow.isDestroyed() ) return;

	if( dev() ) {
		const url = createDevRendererEntryURL( 'MainView' );
		mainWindow.webContents.loadURL( url , getFreshRendererLoadURLOptions( url ) );
	} else {
		mainWindow.webContents.loadFile(
			getRendererEntryFilePath( reaxel_ElectronENV().absAppRunningPath , 'MainView' )
		);
	}
};

import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import { getMenuBarHeight , getTrafficLightPosition } from '#src/shared/menubar-geometry';
import { bindMainShellMenuBarClip } from '#main/services/clip-main-shell-to-menubar.utility';
import { dev } from 'electron-is';
import {
	createDevRendererEntryURL ,
	getFreshRendererLoadURLOptions ,
	getRendererEntryFilePath,
} from '#main/services/dev/renderer-entry';
import {
	app ,
	BrowserWindow ,
	type BrowserWindowConstructorOptions ,
	screen ,
	type Rectangle,
} from 'electron';
import _ from 'lodash';
import * as path from 'node:path';
