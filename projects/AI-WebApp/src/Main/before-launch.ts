// Before-Launch: app初始化前的同步逻辑

// 安装source-map支持
install();

setAppProfilePath();
applyPendingDevCleanStart();
registerBrowserWindowKeyboardGuards();

export const isFirstLaunchWithoutUserData = !fs.existsSync( app.getPath( 'userData' ) );

// 初始化日志系统
logger.initialize();

// 设置进程标题
process.title = "AI Web App";

// 读取持久化设置, 应用需要在app.ready之前设置的Chromium flags
applyPreLaunchSettings();

// 监听应用退出前事件
app.on('before-quit', () => {
	( app as any ).__aiWebAppQuitting = true;
	BrowserWindow.getAllWindows().forEach( win => {
		if( !win.isDestroyed() ) {
			win.destroy();
		}
	} );
});

function applyPreLaunchSettings() {
	try {
		const settingsPath = path.join( app.getPath( 'userData' ) , 'user-settings.json' );
		if( !fs.existsSync( settingsPath ) ) return;
		const content = fs.readFileSync( settingsPath , 'utf-8' );
		const parsed = JSON.parse( content );
		const settings = parsed?.settings;
		if( !settings ) return;

		const language = resolveLanguagePreference(
			normalizeLanguagePreference( settings.appearance?.language ) ,
			getPreLaunchSystemLanguage(),
		);
		app.commandLine.appendSwitch( 'lang' , language );
		nativeTheme.themeSource = normalizeThemePreference(
			settings.appearance?.theme ,
			settings.appearance?.darkmode,
		);

		// GPU acceleration 必须在 app.ready 之前设置
		if( settings.system?.gpu_acceleration === false ) {
			app.disableHardwareAcceleration();
			console.log( '[Before-Launch] GPU hardware acceleration disabled by user settings.' );
		}
	} catch ( error ) {
		console.warn( '[Before-Launch] Failed to read pre-launch settings:' , error );
	}
}

function getPreLaunchSystemLanguage() {
	try {
		const preferredLanguages = app.getPreferredSystemLanguages();
		if( preferredLanguages.length ) {
			return resolvePreferredSystemLanguage( preferredLanguages );
		}
	} catch ( error ) {
		console.warn( '[Before-Launch] Failed to get preferred system languages:' , error );
	}
	return 'en-US';
}

import './foundation/electron.conf';
import { install } from 'source-map-support';
import logger from 'electron-log/main';
import { app, BrowserWindow, nativeTheme } from 'electron';
import process from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setAppProfilePath } from "#main/foundation/debug/app-data-path";
import { applyPendingDevCleanStart } from '#main/services/dev/clean-start';
import { registerBrowserWindowKeyboardGuards } from '#main/services/shortcuts/window-keyboard';
import {
	normalizeLanguagePreference ,
	normalizeThemePreference ,
	resolvePreferredSystemLanguage ,
	resolveLanguagePreference,
} from '#src/shared/appearance';
