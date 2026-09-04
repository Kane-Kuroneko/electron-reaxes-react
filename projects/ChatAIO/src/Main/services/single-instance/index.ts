/**
 * 同一 userData 只允许一个 ChatAIO 进程。第二次启动唤起已有 Main / Guiding，不弹「只允许一例」。
 * 必须在 setAppProfilePath 之后调用：锁跟 userData 走（生产 / ChatAIO-dev / E2E 临时目录互不影响）。
 * 设计：docs/features/single-instance.md
 */

let primaryInstance = false;

export const isChatAIOPrimaryInstance = () => {
	return primaryInstance === true;
};

/**
 * @return {boolean} 是否拿到锁。false 时调用方应立刻 app.exit，且不要再 startMainRuntime。
 */
export const acquireChatAIOSingleInstanceLock = () : boolean => {
	primaryInstance = app.requestSingleInstanceLock();
	if( primaryInstance === false ) {
		return false;
	}
	app.on( 'second-instance' , () => {
		revealExistingChatAIOWindow();
	} );
	return true;
};

export const revealExistingChatAIOWindow = () : boolean => {
	if( revealMainOrUserFacingWindow() ) {
		return true;
	}
	/* whenReady 里建窗是异步的，second-instance 可能略早于第一扇用户窗 */
	setTimeout( () => {
		revealMainOrUserFacingWindow();
	} , 0 );
	setTimeout( () => {
		revealMainOrUserFacingWindow();
	} , 250 );
	return false;
};

const revealMainOrUserFacingWindow = () : boolean => {
	if( mainWindow && mainWindow.isDestroyed() === false ) {
		showMainWindow();
		return true;
	}
	const fallback = BrowserWindow.getAllWindows().find( win => {
		return win.isDestroyed() === false
			&& !win.getParentWindow()
			&& win.isAlwaysOnTop() === false;
	} );
	if( !fallback ) {
		return false;
	}
	if( fallback.isMinimized() ) {
		fallback.restore();
	}
	if( fallback.isVisible() === false ) {
		fallback.show();
	}
	fallback.focus();
	fallback.moveTop();
	return true;
};

import {
	mainWindow ,
	showMainWindow,
} from '#main/mainWindow';
import {
	app ,
	BrowserWindow,
} from 'electron';
