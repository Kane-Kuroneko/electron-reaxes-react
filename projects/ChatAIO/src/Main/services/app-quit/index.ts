/**
 * 每扇 BrowserWindow 的 close / closed：托盘 hide vs 退出。
 * 不能依赖 window-all-closed：DropdownView / FloatingView 是辅助窗，关主窗后仍会拦住该事件。
 * 用户窗（Main / Guiding）全没了且未 hide 到托盘 → Windows/Linux 直接 exit。
 * 辅助窗识别：parent / alwaysOnTop（Electron 没有 isSkipTaskbar）。
 * 设计：docs/issues/close-without-tray-process-lingers.md
 */

const windowsWithQuitLifecycle = new WeakSet<BrowserWindow>();

export const markChatAIOQuitting = () => {
	( app as ChatAIOQuittingApp ).__chatAIOQuitting = true;
};

export const isChatAIOQuitting = () : boolean => {
	return ( app as ChatAIOQuittingApp ).__chatAIOQuitting === true;
};

export const destroyAllBrowserWindows = () => {
	BrowserWindow.getAllWindows().forEach( win => {
		if( win.isDestroyed() === false ) {
			win.destroy();
		}
	} );
};

export const countUserFacingBrowserWindows = () : number => {
	return BrowserWindow.getAllWindows().filter( isUserFacingBrowserWindow ).length;
};

/** 托盘 Quit / 用户窗全关：立刻结束进程，不走可能被拦截的 app.quit()。 */
export const exitChatAIOProcess = ( exitCode = 0 ) => {
	markChatAIOQuitting();
	destroyTray();
	destroyAllBrowserWindows();
	app.exit( exitCode );
};

const shouldCloseToTrayNow = () : boolean => {
	const currentSettings = getSettingsConfigService().getEffectiveSettings();
	return shouldMinimizeMainWindowToTray( {
		showTray : currentSettings.system.show_tray === true ,
		closeToTray : currentSettings.system.close_to_tray === true ,
		trayActive : isTrayActive() ,
		quitting : isChatAIOQuitting(),
	} );
};

const isMainBrowserWindow = ( win : BrowserWindow ) : boolean => {
	return Boolean( mainWindow ) && mainWindow.isDestroyed() === false && win === mainWindow;
};

/**
 * 每扇窗绑一次。Main 在 close 时按托盘两层勾选决定 hide；
 * closed 后若任务栏用户窗为 0，Windows/Linux 退出（辅助窗不算实例）。
 */
export const bindBrowserWindowQuitLifecycle = ( win : BrowserWindow ) => {
	if( !win || win.isDestroyed() ) {
		return;
	}
	if( windowsWithQuitLifecycle.has( win ) ) {
		return;
	}
	windowsWithQuitLifecycle.add( win );

	win.on( 'close' , event => {
		if( isChatAIOQuitting() ) {
			return;
		}
		if( isMainBrowserWindow( win ) && shouldCloseToTrayNow() ) {
			event.preventDefault();
			win.hide();
		}
	} );

	win.on( 'closed' , () => {
		if( shouldExitAppAfterWindowClosed( {
			platform : process.platform ,
			quitting : isChatAIOQuitting() ,
			remainingUserFacingCount : countUserFacingBrowserWindows(),
		} ) ) {
			exitChatAIOProcess( 0 );
		}
	} );
};

/** 所有之后创建的 BrowserWindow 都走同一套 close 判定。 */
export const registerAppWindowQuitLifecycle = () => {
	app.on( 'browser-window-created' , ( _event , win ) => {
		bindBrowserWindowQuitLifecycle( win );
	} );
	BrowserWindow.getAllWindows().forEach( bindBrowserWindowQuitLifecycle );
};

type ChatAIOQuittingApp = typeof app & {
	__chatAIOQuitting? : boolean;
};

import { shouldMinimizeMainWindowToTray } from './should-minimize-to-tray.utility';
import {
	isUserFacingBrowserWindow ,
	shouldExitAppAfterWindowClosed,
} from './should-exit-after-window-closed.utility';
import { mainWindow } from '#main/mainWindow';
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import {
	destroyTray ,
	isTrayActive,
} from '#main/services/tray';
import {
	app ,
	BrowserWindow,
} from 'electron';
