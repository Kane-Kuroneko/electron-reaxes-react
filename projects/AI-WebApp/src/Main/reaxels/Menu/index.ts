export const reaxel_Menu = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {} );
	
	let i18nInstance: (() => { i18n: (text: string) => string }) | null = null;
	
	const t = (text: string) => {
		return i18nInstance ? i18nInstance().i18n(text) : text;
	};
	
	function setI18nInstance(i18n: () => { i18n: (text: string) => string }) {
		i18nInstance = i18n;
	}
	
	function createMenu() {
		const settings = getRuntimeSettings();
		const enabledAIs = settings.AIs.filter( ai => !ai.disabled );
		const { currentAIViewKey } = Reaxel_View.store;
		
		return Menu.buildFromTemplate( [
			{
				label : t('Application') ,
				submenu : [
					{
						label : `[${ Reaxel_View.store.settingsViewOpened ? '✔️' : '' }${t('Settings')}]` ,
						click() {
							Reaxel_View.setState( { settingsViewOpened : true } );
							const settingsView = reaxel_SettingsView().initSettingsView();
							settingsView.setVisible( true );
							mainWindow.contentView.addChildView( settingsView );
						},
					} ,
					{ type : 'separator' } ,
					{
						label : t("Check for Updates") ,
						click : () => {
							autoUpdater.checkForUpdates();
						} ,
					} ,
					{ type : 'separator' } ,
					{
						role : 'quit',
					},
				],
			} ,
			{
				label : t('View') ,
				submenu : [
					{
						label : t('Reload') ,
						accelerator : 'ctrl+r' ,
						click : () => {
							const view = Reaxel_View.store.settingsViewOpened
								? reaxel_SettingsView.store.settingsView.view
								: reaxel_AIViews().currentAIView?.view;
							view?.webContents.reload();
						} ,
					} ,
					{
						label : t('Force Reload') ,
						accelerator : 'ctrl+shift+r' ,
						click : () => {
							if( Reaxel_View.store.settingsViewOpened ) {
								reaxel_SettingsView.store.settingsView.view?.webContents.reloadIgnoringCache();
								return;
							}
							const currentAIView = reaxel_AIViews().currentAIView;
							currentAIView?.view.webContents.loadURL( currentAIView.domain );
						} ,
					} ,
					{
						label : t('Developer Tools') ,
						accelerator : 'f12' ,
						click : () => {
							const view = Reaxel_View.store.settingsViewOpened
								? reaxel_SettingsView.store.settingsView.view
								: reaxel_AIViews().currentAIView?.view;
							view?.webContents.toggleDevTools();
						} ,
					} ,
					{
						label : t('Wipe and Reload This Page') ,
						click : async() => {
							const result = await dialog.showMessageBox( {
								type : 'warning' ,
								message : t('This operation will clear all authentication data from the current page and reload it. \r\nInclude cookies, local storage, and other data.') ,
								buttons : [ t('Yes') , t('No') ] ,
								cancelId : 1 ,
								defaultId : 0,
							} );
									
							if( result.response !== 0 ) return;
									
							const { currentAIView } = reaxel_AIViews();
							if( !currentAIView ) return;
							const { origin } = new URL( currentAIView.view.webContents.getURL() );
									
							await currentAIView.view.webContents.clearHistory();
							await currentAIView.view.webContents.session.clearStorageData( { origin } );
							await currentAIView.view.webContents.session.clearCache();
							await currentAIView.view.webContents.session.clearData( { origins : [ origin ] } );
							await currentAIView.view.webContents.session.clearAuthCache();
							currentAIView.view.webContents.reloadIgnoringCache();
						} ,
					} ,
					{ type : 'separator' } ,
					{ role : 'resetZoom' } ,
					{
						label : t('Zoom In') ,
						accelerator : 'CmdOrCtrl+=' ,
						role : 'zoomIn',
					} ,
					{ role : 'zoomOut' } ,
					{ type : 'separator' } ,
					{ role : 'togglefullscreen' },
				],
			} ,
			{
				label : t("Switch AI") ,
				submenu : enabledAIs.length
					? enabledAIs.map( ai => ( {
						label : ai.label ,
						type : 'radio' as const ,
						checked : currentAIViewKey === ai.id ,
						click : createClickMenuHandler( ai.id ),
					} ) )
					: [
						{
							label : t('No enabled AI pages') ,
							enabled : false,
						},
					],
			},
		] );
	}
	
	function createClickMenuHandler( aiId:string ) {
		return async() => {
			await reaxel_AIViews().showAIView( aiId , getRuntimeSettings() );
			rebuildMenu();
		};
	}
	
	function rebuildMenu() {
		mainWindow.setMenu( createMenu() );
	}
	
	const menuReady = app.whenReady().then( async() => {
		rebuildMenu();
	} );
	
	obsReaction( ( first ) => {
		if( first ) return;
		rebuildMenu();
	} , () => [
		Reaxel_View.store.currentAIViewKey ,
		Reaxel_View.store.settingsViewOpened,
	] );
	
	const rtn = {
		menuReady ,
		createMenu ,
		rebuildMenu,
		setI18nInstance,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const getRuntimeSettings = ():Settings => {
	const settingsConfigService = getSettingsConfigService();
	const aiConfigService = getAIConfigService();
	return {
		...settingsConfigService.getEffectiveSettings() ,
		AIs : aiConfigService.getEffectiveAIs(),
	};
};

import { Reaxel_View } from '../Views';
import {
	app ,
	autoUpdater ,
	dialog ,
	Menu,
} from 'electron';
import { mainWindow } from "#main/mainWindow";
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
import { getAIConfigService } from "#main/services/settings/ai-config-service";
import { getSettingsConfigService } from "#main/services/settings/settings-config-service";
import type { Settings } from "#src/Types/SettingsTypes";
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from 'reaxes';
