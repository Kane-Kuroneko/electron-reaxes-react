let mainRuntimeStarted = false;
let closeHandlerBound = false;

export const isMainRuntimeStarted = () => mainRuntimeStarted;

/**
 * 主运行时启动契约（menubar 与 AI view 解耦）：
 *
 * Phase 0  MenubarHost   — 注册 menubar IPC / 快捷键（必须在 MainView loadURL 之前）
 * Phase 1  AppConfig     — settings / i18n / appearance（菜单数据全部来自主进程本地）
 * Phase 2  MainWindow    — 创建窗口并 load MainView，立刻 attach menubar 宿主
 * Phase 3  OverlayWarm   — 挪到 menubar visual-ready 之后（initRuntimeViews 内 initFloatingView）
 * Phase 4  ShellChrome   — tray / 生命周期 / rebuildMenu（structure 在 menu-view:ready 时再推）
 * Phase 5  ContentViews  — 等 menubar visual-ready（菜单项已 layout，或超时）后再 init AI / Prompt
 * Phase 6  SettingsPreload — 启动 AI 页 ready（或超时）后再创建 Settings WCV，不跟 AI loadURL 抢
 *
 * 禁止把 ensureMenubarHostReady / attachMainWindow 排到 initRuntimeViews 之后。
 * 禁止在 menubar 首绘之前批量 preload AI 或 load FloatingView（会与 localhost MainView 抢 GPU/网络）。
 * 禁止在启动 AI 页 settle 之前 preload SettingsView（docs/features/settings-view-preload.md）。
 * menu-view:ready 只推 structure，不能当 Phase 5 门闩。
 * 冷启动白屏观测：docs/features/menubar-cold-start-monitor.md
 */
export const startMainRuntime = async( options:StartMainRuntimeOptions = {} ) => {
	console.log( '[Runtime] startMainRuntime:' , options );

	if( !mainRuntimeStarted ) {
		mainRuntimeStarted = true;

		/* Phase 0 — MenubarHost：IPC 必须先于任何 MainView navigation */
		getMenubarColdStartMonitor().beginBoot();
		getMenubarColdStartMonitor().note( 'phase-0-menubar-host' );
		reaxel_MainView().ensureMenubarHostReady();

		/* Phase 1 — AppConfig */
		getMenubarColdStartMonitor().note( 'phase-1-app-config' );
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
			reaxel_PromptViews().syncAppearanceFromSettings();
			reaxel_MainView().syncAppearanceFromSettings();
			/* 冷启动 visual-ready 之前禁止创建 AI WCV；initRuntimeViews 会按当时主题再 sync */
			if( Reaxel_View().areRuntimeViewsInitialized() ) {
				void reaxel_AIViews().syncAIViewsWithConfig( currentSettings );
			}
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
				const currentSettings = getSettingsConfigService().getEffectiveSettings();
				const theme = resolveAppearance( currentSettings.appearance ).theme;
				void createMainWindow( { theme } ).then( ( win ) => {
					reaxel_MainView().attachMainWindow();
					useBeautifulDevtool( win );
					reaxel_Menu().rebuildMenu();
				} );
			}
		} );

		initSwitchPerformanceLogging();

		/* Phase 2 — MainWindow + menubar attach（与 AI 无关） */
		const win = await createMainWindow( { theme : resolvedAppearance.theme } );
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

		/* Phase 4 — ShellChrome（原生 tray/菜单，不抢 MainView webpack） */
		getMenubarColdStartMonitor().note( 'phase-4-shell-chrome' );
		if( settings.system.show_tray ) {
			initTray();
		}
		reaxel_Menu().rebuildMenu();
		reaxel_AppUpdater();

		/* Phase 5 — 等菜单项 layout 后再拉 FloatingView / 当前 WCV。
		   menu-view:ready 太早（React 未 commit）。超时后仍继续。
		   设计：docs/features/menubar-cold-start-monitor.md */
		getMenubarColdStartMonitor().note( 'phase-5-wait-renderer' );
		const menubarReady = await reaxel_MainView().waitUntilRendererReady( {
			timeoutMs : 15000,
		} );
		console.log( '[Runtime] menubar renderer ready:' , menubarReady );
		getMenubarColdStartMonitor().note( 'phase-5-content-views-start' , {
			menubarReady ,
		} );
		await Reaxel_View().initRuntimeViews();
		console.log( '[Runtime] runtime views initialized.' );
	} else {
		/* 运行时已启动：只保证窗口与 menubar 宿主仍附着（例如 guiding → runtime） */
		const currentSettings = getSettingsConfigService().getEffectiveSettings();
		const theme = resolveAppearance( currentSettings.appearance ).theme;
		const win = await createMainWindow( { theme } );
		reaxel_MainView().attachMainWindow();
		useBeautifulDevtool( win );
		await reaxel_MainView().waitUntilRendererReady( {
			timeoutMs : 15000,
		} );
		reaxel_FloatingView().initFloatingView();
	}

	if( options.openSettings ) {
		openSettingsView( options.openDevTools ?? dev() );
	}

	return mainWindow;
};

export const openSettingsView = (openDevTools = false) => {
	const settingsView = reaxel_SettingsView().initSettingsView();
	Reaxel_View.setState( { settingsViewOpened : true } );
	Reaxel_View().fitWindow();
	/* present('switch') 由 Reaxel_View obsReaction 在 settingsViewOpened 变化时统一处理 */
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
import { getMenubarColdStartMonitor } from '#main/reaxels/Views/Main-View/menubar-cold-start-monitor.retexel';
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
import { reaxel_AppUpdater } from '#main/reaxels/electron-updater';
import { getSettingsConfigService } from '#main/services/settings/settings-config-service';
import {
	applyElectronAppearance ,
	getAppearanceEnvironment ,
	resolveAppearance,
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
} from '#shared/appearance';
import { dev } from 'electron-is';
import { initSwitchPerformanceLogging } from '#main/services/performance/switch-perf';
import {
	app ,
	nativeTheme,
} from 'electron';
