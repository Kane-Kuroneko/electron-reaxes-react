const { runInExcutable, absAppRunningPath,absAppStaticsPath} = reaxel_ElectronENV();

export const reaxel_ChatChannelsWindow = reaxel(() => {
	
	const win = new BrowserWindow({
		width: 600,
		height: 400,
		frame: false,             // 无边框
		transparent: true,        // 背景透明
		alwaysOnTop: true,        // 始终置顶
		skipTaskbar: true,        // 不在任务栏显示
		resizable: true,         // 可选
		focusable: true,          // 是否可聚焦，若用于纯展示可设为 false
		hasShadow: false,         // 可选，关闭阴影
		webPreferences: {
			devTools : true,
			nodeIntegration: false,
			contextIsolation: true,
			preload : path.join(absAppRunningPath,'preload.js' ) ,
			experimentalFeatures : false ,
		}
	})
})


import { BrowserWindow } from 'electron';
import { reaxel } from 'reaxes';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import path from 'path';
