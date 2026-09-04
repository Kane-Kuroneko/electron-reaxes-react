/**
 * 某扇窗 closed 之后还要不要结束进程。
 * 用户窗 = Main / Guiding。Dropdown / Floating 是辅助窗，不算「还活着的实例」。
 * Electron 没有 isSkipTaskbar()（只有构造项 skipTaskbar + setSkipTaskbar），
 * 辅助窗用 parent（Floating）或 alwaysOnTop（Dropdown / Floating）识别。
 * 设计：docs/issues/close-without-tray-process-lingers.md
 */

export type ExitAfterWindowClosedInput = {
	platform : string;
	quitting : boolean;
	remainingUserFacingCount : number;
};

export type WindowRoleProbe = {
	isDestroyed() : boolean;
	isAlwaysOnTop() : boolean;
	getParentWindow() : unknown;
};

export const shouldExitAppAfterWindowClosed = (
	input : ExitAfterWindowClosedInput,
) : boolean => {
	if( input.quitting === true ) {
		return false;
	}
	if( input.platform === 'darwin' ) {
		return false;
	}
	return input.remainingUserFacingCount === 0;
};

export const isUserFacingBrowserWindow = ( win : WindowRoleProbe ) : boolean => {
	if( !win || win.isDestroyed() ) {
		return false;
	}
	if( win.getParentWindow() ) {
		return false;
	}
	if( win.isAlwaysOnTop() ) {
		return false;
	}
	return true;
};
