let mainRuntimeStarted = false;
let closeHandlerBound = false;

export const isMainRuntimeStarted = () => mainRuntimeStarted;

export const startMainRuntime = async( options:StartMainRuntimeOptions = {} ) => {
	console.log( '[Runtime] startMainRuntime:' , options );
	const win = await createMainWindow();
	const settingsRuntime = reaxel_Settings();
	const settings = settingsRuntime.reloadFromDisk();
	
	if( !mainRuntimeStarted ) {
		mainRuntimeStarted = true;
		useBeautifulDevtool( win );
		const resolvedAppearance = applyElectronAppearance( settings.appearance );
		reaxel_I18n().setLanguage( resolvedAppearance.language as any );
		
		reaxel_Menu().setI18nInstance( reaxel_I18n );
		setTrayI18nInstance( reaxel_I18n );
		reaxel_Menu().rebuildMenu();
		
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
		
		if( settings.system.show_tray ) {
			initTray();
		}
		
		nativeTheme.on( 'updated' , () => {
			const currentSettings = settingsRuntime.getCurrentSettings();
			if( currentSettings.appearance.theme !== 'system' ) {
				return;
			}
			void reaxel_AIViews().syncAIViewsWithConfig( currentSettings );
			reaxel_PromptViews().syncAppearanceFromSettings();
		} );

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
		
		initSwitchPerformanceLogging();
		await Reaxel_View().initRuntimeViews();
		console.log( '[Runtime] runtime views initialized.' );
	}
	
	if( options.openSettings ) {
		openSettingsView( options.openDevTools ?? dev() );
	}
	
	return win;
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

import { createMainWindow , mainWindow } from './mainWindow';
import { useBeautifulDevtool } from '#generics/modify-electron/beautiful-devtool';
import { reaxel_Settings } from "#main/reaxels/Settings";
import { reaxel_Menu } from './reaxels/Menu';
import { reaxel_I18n } from '#main/reaxels/I18n';
import { Reaxel_View } from "#main/reaxels/Views";
import { reaxel_AIViews } from '#main/reaxels/Views/AI-Views';
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
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
