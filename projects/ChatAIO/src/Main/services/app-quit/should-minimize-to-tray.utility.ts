/**
 * 点标题栏 X 时是否应 hide 到托盘，而不是结束进程。
 * 必须 tray 真正还在：settings 写了 show_tray 但图标已被 destroy 时，hide 会变成无入口僵尸。
 * 设计：docs/issues/close-without-tray-process-lingers.md
 */

export type MinimizeToTrayDecision = {
	showTray : boolean;
	closeToTray : boolean;
	trayActive : boolean;
	quitting : boolean;
};

export const shouldMinimizeMainWindowToTray = (
	input : MinimizeToTrayDecision,
) : boolean => {
	if( input.quitting === true ) {
		return false;
	}
	return input.showTray === true
		&& input.closeToTray === true
		&& input.trayActive === true;
};
