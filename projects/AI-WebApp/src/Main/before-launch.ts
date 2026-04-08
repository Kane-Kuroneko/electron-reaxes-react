// Before-Launch: app初始化前的同步逻辑

// 安装source-map支持
install();

setAppProfilePath();

// 初始化日志系统
logger.initialize();

// 设置进程标题
process.title = "AI Web App";

// 监听应用退出前事件
app.on('before-quit', () => {
	BrowserWindow.getAllWindows()?.[0]?.destroy();
});
import './foundation/electron.conf';
import { install } from 'source-map-support';
import logger from 'electron-log/main';
import { app, BrowserWindow } from 'electron';
import process from 'node:process';
import { setAppProfilePath } from "#main/foundation/debug/app-data-path";
