// Before-Launch: app初始化前的同步逻辑

applyGlobalBrowserIdentityFallback();

// 安装source-map支持
install();

app.setName( 'ChatAIO' );
setAppProfilePath();
/* 单实例锁必须跟 userData：生产 / ChatAIO-dev / E2E 临时目录互不抢。
   设计：docs/features/single-instance.md */
if( acquireChatAIOSingleInstanceLock() === false ) {
	app.exit( 0 );
} else {
	installE2EFaultCollector();
	applyPendingDevCleanStart();
	registerBrowserWindowKeyboardGuards();

	/* 所有 BrowserWindow（含 Guiding / Floating）统一按 isPackaged 选 app-icon / app-icon-dev */
	app.on( 'browser-window-created' , ( _event , win ) => {
		applyRuntimeAppIcon( win );
	} );
	/* 每扇窗 close：托盘两层勾选 hide，或用户窗清零后 Windows 退出。
	   设计：docs/issues/close-without-tray-process-lingers.md */
	registerAppWindowQuitLifecycle();

	logger.initialize();
	process.title = "ChatAIO";
	applyPreLaunchSettings();

	app.on( 'before-quit' , () => {
		/* 菜单 Quit / app.quit() 走这里。点 X 的 Windows 路径见 app-quit（app.exit）。
		   设计：docs/issues/close-without-tray-process-lingers.md */
		markChatAIOQuitting();
		destroyAllBrowserWindows();
	} );
}

/* E2E 的 mkdtemp 会先建目录，不能再用 existsSync 判断首启；显式 env 才走 GuidingView。 */
export const isFirstLaunchWithoutUserData = isChatAioE2E()
	? process.env.CHATAIO_E2E_FIRST_LAUNCH === '1'
	: !fs.existsSync( app.getPath( 'userData' ) );

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
import { applyGlobalBrowserIdentityFallback } from '#main/services/browser-identity';
import { applyRuntimeAppIcon } from '#main/services/app-icons';
import { install } from 'source-map-support';
import logger from 'electron-log/main';
import { app, BrowserWindow, nativeTheme } from 'electron';
import process from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setAppProfilePath } from "#main/foundation/debug/app-data-path";
import { isChatAioE2E } from '#main/foundation/e2e-mode';
import { installE2EFaultCollector } from '#main/foundation/e2e-faults';
import {
	acquireChatAIOSingleInstanceLock,
} from '#main/services/single-instance';
import {
	destroyAllBrowserWindows ,
	markChatAIOQuitting ,
	registerAppWindowQuitLifecycle,
} from '#main/services/app-quit';
import { applyPendingDevCleanStart } from '#main/services/dev/clean-start';
import { registerBrowserWindowKeyboardGuards } from '#main/services/shortcuts/window-keyboard';
import {
	normalizeLanguagePreference ,
	normalizeThemePreference ,
	resolvePreferredSystemLanguage ,
	resolveLanguagePreference,
} from '#shared/appearance';
