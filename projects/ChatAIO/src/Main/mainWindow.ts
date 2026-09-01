const { absAppRunningPath } = reaxel_ElectronENV();

export let mainWindow:BrowserWindow = null;

export type CreateMainWindowOptions = {
	/** 与 settings 解析后的 menubar 主题一致；缺省时从磁盘 settings 再解析一次 */
	theme? : 'light' | 'dark';
};

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

const resolveCreateTheme = (theme?:'light' | 'dark'):'light' | 'dark' => {
	if( theme === 'light' || theme === 'dark' ) {
		return theme;
	}
	try {
		return resolveAppearance(
			getSettingsConfigService().getEffectiveSettings().appearance ,
		).theme;
	} catch {
		return 'light';
	}
};

export const createMainWindow = async( options:CreateMainWindowOptions = {} ) => {
	if( mainWindow && !mainWindow.isDestroyed() ) {
		return mainWindow;
	}
	await app.whenReady();
	const theme = resolveCreateTheme( options.theme );
	const menubarChrome = getMenubarTitleBarOverlayOptions( theme );
	const { width , height } = getLogicalResolution();
	const defaultOptions:BrowserWindowConstructorOptions = {
		width : dev() ? width : 1280 ,
		height : dev() ? height : 720 ,
		icon : getAppIconPath() ,
		webPreferences : {
			nodeIntegration : false ,
			contextIsolation : true ,
			preload : path.join( absAppRunningPath , 'preload.js' ),
			/* 默认节流：与浏览器一致的隐藏/显示产帧路径 */
		},
		// macOS 标题栏：hidden + trafficLightPosition（勿用 hiddenInset：死区/拖拽失效）
		// 几何见 shared/menubar-geometry.ts：红绿灯与菜单控件共垂直中心
		...( process.platform === 'darwin' && {
			titleBarStyle : 'hidden' as const,
			trafficLightPosition : getTrafficLightPosition(),
			backgroundColor : '#00000000' ,
		} ),
		// Windows/Linux：构造期即写入 menubar 同色 background + overlay，杜绝首帧色差断层
		...( process.platform !== 'darwin' && {
			titleBarStyle : 'hidden' as const,
			backgroundColor : menubarChrome.color ,
			titleBarOverlay : {
				color : menubarChrome.color ,
				symbolColor : menubarChrome.symbolColor ,
				height : menubarChrome.height ,
			} as any,
		} ),
	};
	
	mainWindow = new BrowserWindow( _.merge( {} , defaultOptions ) );
	applyRuntimeAppIcon( mainWindow );

	// macOS: 主 webContents 仅承载 menubar；透明底色避免 AI WCV 未重绘时露出灰白壳层
	if( process.platform === 'darwin' ) {
		mainWindow.setBackgroundColor( '#00000000' );
	} else {
		applyMenubarWindowChrome( mainWindow , theme );
	}

	/*
	 * MainView（menubar）loadURL 前，调用方必须已执行
	 * reaxel_MainView().ensureMenubarHostReady()（见 runtime.ts Phase 0）。
	 * Electron 约定：ipcMain handler 注册先于 renderer 导航。
	 * 携带 theme query，让 renderer 首帧 CSS 与 overlay 同色（不必等 IPC）。
	 * 检测器必须在 load 前挂上 wc 事件，否则会丢掉 did-start-loading。
	 */
	getMenubarColdStartMonitor().instrumentMainWindow( mainWindow );
	loadMainViewHTML( theme );

	/* 主壳 View 裁到 menubar：避免全窗 drag provider 叠进内容区（electron#41002） */
	bindMainShellMenuBarClip( mainWindow );
	if( process.platform !== 'darwin' ) {
		applyMenubarWindowChrome( mainWindow , theme );
	}

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
 * 尽早 insertCSS / dataset.theme，使深色主题首帧就与 overlay 同色。
 */
const loadMainViewHTML = ( theme:'light' | 'dark' ) => {
	if( !mainWindow || mainWindow.isDestroyed() ) return;

	const paintEarly = () => {
		primeMainViewMenubarPaint( mainWindow.webContents , theme );
	};
	getMenubarColdStartMonitor().note( 'phase-2-load-start' , {
		dev : dev() ,
		theme ,
	} );
	/* did-start-loading 时文档可能还没有，insertCSS 失败则等 dom-ready。
	   真正早于 webpack 主包的底色靠 index.template.html 的 MainView 内联脚本。 */
	mainWindow.webContents.on( 'did-start-loading' , paintEarly );
	mainWindow.webContents.once( 'dom-ready' , paintEarly );
	mainWindow.webContents.once( 'did-finish-load' , paintEarly );

	if( dev() ) {
		void loadDevRendererEntryWithRetry(
			mainWindow.webContents ,
			'MainView' ,
			{ theme } ,
			'MainView/menubar',
		);
		return;
	}

	mainWindow.webContents.loadFile(
		getRendererEntryFilePath( reaxel_ElectronENV().absAppRunningPath , 'MainView' ) ,
		{ query : { theme } },
	);
};

/** 在页面脚本跑完主题 IPC 前，强制 menubar 宿主底色与 overlay 一致（仅 Windows/Linux） */
const primeMainViewMenubarPaint = (
	webContents : Electron.WebContents ,
	theme : 'light' | 'dark',
) => {
	if( process.platform === 'darwin' ) return;
	if( webContents.isDestroyed() ) return;
	const color = getMenubarTitleBarOverlayOptions( theme ).color;
	const css = `
		:root { --menu-view-bg: ${ color } !important; }
		html, body, #react-app-root { background: ${ color } !important; }
	`;
	void webContents.insertCSS( css ).catch( () => {} );
	void webContents.executeJavaScript(
		`document.documentElement.dataset.theme=${ JSON.stringify( theme ) };` ,
		true ,
	).catch( () => {} );
};

import { getMenubarColdStartMonitor } from '#main/reaxels/Views/Main-View/menubar-cold-start-monitor.retexel';
import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import {
	getMenubarTitleBarOverlayOptions ,
	getTrafficLightPosition,
} from '#shared/menubar-geometry';
import { bindMainShellMenuBarClip } from '#main/services/clip-main-shell-to-menubar.utility';
import { applyMenubarWindowChrome } from '#main/services/menubar-window-chrome.utility';
import { resolveAppearance } from '#main/services/appearance';
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import {
	applyRuntimeAppIcon ,
	getAppIconPath,
} from '#main/services/app-icons';
import { dev } from 'electron-is';
import {
	loadDevRendererEntryWithRetry ,
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
