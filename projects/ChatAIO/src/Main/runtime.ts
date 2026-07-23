let mainRuntimeStarted = false;
let closeHandlerBound = false;

export const isMainRuntimeStarted = () => mainRuntimeStarted;

/**
 * 主运行时启动契约（menubar 与 AI view 解耦）：
 *
 * Phase 0  MenubarHost   — 注册 menubar IPC / 快捷键（必须在 MainView loadURL 之前）
 * Phase 1  AppConfig     — settings / i18n / appearance（菜单数据全部来自主进程本地）
 * Phase 2  MainWindow    — 创建窗口并 load MainView，立刻 attach menubar 宿主
 * Phase 3  OverlayWarm   — FloatingView 预热（独立窗口，不阻塞 menubar）
 * Phase 4  ShellChrome   — tray / 生命周期 / rebuildMenu（structure 在 menu-view:ready 时再推）
 * Phase 5  ContentViews  — AI / Prompt 等 runtime views（与 menubar 握手无关）
 *
 * 禁止把 ensureMenubarHostReady / attachMainWindow 排到 initRuntimeViews 之后。
 */
export const startMainRuntime = async( options:StartMainRuntimeOptions = {} ) => {
	console.log( '[Runtime] startMainRuntime:' , options );

	if( !mainRuntimeStarted ) {
		mainRuntimeStarted = true;

		/* Phase 0 — MenubarHost：IPC 必须先于任何 MainView navigation */
		reaxel_MainView().ensureMenubarHostReady();

		/* Phase 1 — AppConfig */
		const settingsRuntime = reaxel_Settings();
		const settings = settingsRuntime.reloadFromDisk();
		const resolvedAppearance = applyElectronAppearance( settings.appearance );
		reaxel_I18n().setLanguage( resolvedAppearance.language as any );
		reaxel_Menu().setI18nInstance( reaxel_I18n );
		setTrayI18nInstance( reaxel_I18n );

		useIpcRendererToMain( 'language-change' ).on( ( e , language ) => {
			const environment = getAppearanceEnvironment();
			const resolvedLanguage = resolveLanguagePreference(
				normalizeLanguagePreference( language ) ,
				environment.systemLanguage,
			);
			reaxel_I18n().setLanguage( resolvedLanguage as any );
			reaxel_Menu().rebuildMenu();
			if( isTrayActive() ) {
				updateTrayMenu();
			}
		} );

		nativeTheme.on( 'updated' , () => {
			const currentSettings = settingsRuntime.getCurrentSettings();
			if( currentSettings.appearance.theme !== 'system' ) {
				return;
			}
			void reaxel_AIViews().syncAIViewsWithConfig( currentSettings );
			reaxel_PromptViews().syncAppearanceFromSettings();
			reaxel_MainView().syncAppearanceFromSettings();
		} );

		app.on( 'window-all-closed' , () => {
			if( process.platform !== 'darwin' ) {
				app.quit();
			}
		} );

		app.on( 'activate' , () => {
			if( mainWindow && !mainWindow.isDestroyed() ) {
				showMainWindow();
			} else {
				void createMainWindow().then( ( win ) => {
					reaxel_MainView().attachMainWindow();
					useBeautifulDevtool( win );
					reaxel_Menu().rebuildMenu();
				} );
			}
		} );

		initSwitchPerformanceLogging();

		/* Phase 2 — MainWindow + menubar attach（与 AI 无关） */
		const win = await createMainWindow();
		reaxel_MainView().attachMainWindow();
		useBeautifulDevtool( win );

		if( !closeHandlerBound ) {
			closeHandlerBound = true;
			win.on( 'close' , event => {
				if( ( app as any ).__chatAIOQuitting ) {
					return;
				}
				const currentSettings = getSettingsConfigService().getEffectiveSettings();
				if( currentSettings.system.show_tray && currentSettings.system.close_to_tray ) {
					event.preventDefault();
					win.hide();
				}
			} );
		}

		/* Phase 3 — OverlayWarm */
		reaxel_FloatingView().initFloatingView();

		/* Phase 4 — ShellChrome */
		if( settings.system.show_tray ) {
			initTray();
		}
		reaxel_Menu().rebuildMenu();

		/* Phase 5 — ContentViews（AI）；不得回挡 menubar */
		await Reaxel_View().initRuntimeViews();
		console.log( '[Runtime] runtime views initialized.' );
	} else {
		/* 运行时已启动：只保证窗口与 menubar 宿主仍附着（例如 guiding → runtime） */
		const win = await createMainWindow();
		reaxel_MainView().attachMainWindow();
		reaxel_FloatingView().initFloatingView();
		useBeautifulDevtool( win );
	}

	if( options.openSettings ) {
		openSettingsView( options.openDevTools ?? dev() );
	}

	return mainWindow;
};

export const openSettingsView = (openDevTools = false) => {
	Reaxel_View.setState( { settingsViewOpened : true } );
	const settingsView = reaxel_SettingsView().initSettingsView();
	settingsView.setVisible( true );
	mainWindow.contentView.addChildView( settingsView );
	Reaxel_View().fitWindow();
	if( openDevTools ) {
		settingsView.webContents.openDevTools();
	}
	return settingsView;
};

export type StartMainRuntimeOptions = {
	openSettings?: boolean;
	openDevTools?: boolean;
};

import { createMainWindow , mainWindow , showMainWindow } from './mainWindow';
import { useBeautifulDevtool } from '#generics/modify-electron/beautiful-devtool';
import { reaxel_Settings } from "#main/reaxels/Settings";
import { reaxel_Menu } from './reaxels/Menu';
import { reaxel_I18n } from '#main/reaxels/I18n';
import { Reaxel_View } from "#main/reaxels/Views";
import { reaxel_FloatingView } from '#main/reaxels/Views/FloatingView';
import { reaxel_AIViews } from '#main/reaxels/Views/AI-Views';
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import { reaxel_MainView } from '#main/reaxels/Views/Main-View';
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import {
	applyElectronAppearance ,
	getAppearanceEnvironment,
} from '#main/services/appearance';
import {
	initTray ,
	isTrayActive ,
	updateTrayMenu ,
	setI18nInstance as setTrayI18nInstance,
} from '#main/services/tray';
import { useIpcRendererToMain } from '#main/services/ipc';
import {
	normalizeLanguagePreference ,
	resolveLanguagePreference,
} from '#src/shared/appearance';
import { dev } from 'electron-is';
import { initSwitchPerformanceLogging } from '#main/services/performance/switch-perf';
import {
	app ,
	nativeTheme,
} from 'electron';
