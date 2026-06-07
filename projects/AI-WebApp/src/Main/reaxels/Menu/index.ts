export const reaxel_Menu = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {} );
	
	let i18nInstance: (() => { i18n: (text: string) => string }) | null = null;
	
	const t = (text: string) => {
		if (!i18nInstance) {
			console.warn('[Menu] t() called but i18nInstance is null, returning raw text:', text);
			return text;
		}
		return i18nInstance().i18n(text);
	};
	
	function setI18nInstance(i18n: () => { i18n: (text: string) => string }) {
		console.log('[Menu] setI18nInstance called, i18n =', typeof i18n);
		i18nInstance = i18n;
	}
	
	function createMenu() {
		const settings = getRuntimeSettings();
		const enabledAIs = settings.AIs.filter( ai => !ai.disabled );
		const { currentAIViewKey } = Reaxel_View.store;
		const nextAI = resolveAdjacentMenuAI( enabledAIs , currentAIViewKey , 1 );
		const previousAI = resolveAdjacentMenuAI( enabledAIs , currentAIViewKey , -1 );
		const instantiatedAIViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		const canSwitchInstantiatedAI = instantiatedAIViews.length > 1;
		const promptViewLeftVisible = reaxel_PromptViews.store.left.visible || reaxel_PromptViews.store.left.width > 0;
		const promptViewRightVisible = reaxel_PromptViews.store.right.visible || reaxel_PromptViews.store.right.width > 0;
		
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
						label : t('Exit') ,
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
							currentAIView?.view.webContents.loadURL( currentAIView.domain ).catch( error => {
								console.warn( '[Menu] Force reload loadURL failed:' , currentAIView.domain , error );
							} );
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
					{ type : 'separator' } ,
					{
						label : t( 'PromptView Left' ) ,
						type : 'checkbox' ,
						checked : promptViewLeftVisible ,
						accelerator : 'Alt+,' ,
						click : () => {
							reaxel_PromptViews().togglePromptView( 'left' );
						},
					} ,
					{
						label : t( 'PromptView Right' ) ,
						type : 'checkbox' ,
						checked : promptViewRightVisible ,
						accelerator : 'Alt+.' ,
						click : () => {
							reaxel_PromptViews().togglePromptView( 'right' );
						},
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
					{ label : t('Actual Size') , role : 'resetZoom' } ,
					{
						label : t('Zoom In') ,
						accelerator : 'CmdOrCtrl+=' ,
						role : 'zoomIn',
					} ,
					{ label : t('Zoom Out') , role : 'zoomOut' } ,
					{ type : 'separator' } ,
					{ label : t('Toggle Fullscreen') , role : 'togglefullscreen' } ,
					{ type : 'separator' } ,
					{
						label : createPlainMenuLabel( t('Close This AI') ) ,
						accelerator : 'CmdOrCtrl+W' ,
						registerAccelerator : false ,
						enabled : !!reaxel_AIViews().currentAIView ,
						click : () => {
							if( Reaxel_View().closeCurrentAIView() ) {
								rebuildMenu();
							}
						},
					},
				],
			} ,
			{
				label : t("Switch AI") ,
				submenu : enabledAIs.length
					? [
						...enabledAIs.map( ai => ( {
							label : ai.label ,
							type : 'radio' as const ,
							checked : currentAIViewKey === ai.id ,
							click : createClickMenuHandler( ai.id ),
						} ) ),
						{ type : 'separator' as const } ,
						{
							label : createPlainMenuLabel( t('Previous Opened AI') ) ,
							type : 'normal' as const ,
							accelerator : 'Alt+[' ,
							registerAccelerator : false ,
							enabled : canSwitchInstantiatedAI ,
							click : () => {
								void Reaxel_View().turnToPreviousInstantiatedAiPage();
							},
						} ,
						{
							label : createPlainMenuLabel( t('Next Opened AI') ) ,
							type : 'normal' as const ,
							accelerator : 'Alt+]' ,
							registerAccelerator : false ,
							enabled : canSwitchInstantiatedAI ,
							click : () => {
								void Reaxel_View().turnToNextInstantiatedAiPage();
							},
						} ,
						{ type : 'separator' as const } ,
						{
							label : createPlainMenuLabel( t('Previous AI Page') ) ,
							type : 'normal' as const ,
							accelerator : 'CmdOrCtrl+[' ,
							registerAccelerator : false ,
							enabled : enabledAIs.length > 1 ,
							click : () => {
								void Reaxel_View().turnToPreviousAiPage();
							},
						} ,
						{
							label : createPlainMenuLabel( t('Next AI Page') ) ,
							type : 'normal' as const ,
							accelerator : 'CmdOrCtrl+]' ,
							registerAccelerator : false ,
							enabled : enabledAIs.length > 1 ,
							click : () => {
								void Reaxel_View().turnToNextAiPage();
							},
						} ,
					]
					: [
						{
							label : t('No enabled AI pages') ,
							enabled : false,
						},
					],
			},
			{
				label : createAdjacentAIMenuLabel( '⏮️' , t( 'Previous' ) , previousAI ) ,
				accelerator : 'CmdOrCtrl+[' ,
				registerAccelerator : false ,
				enabled : enabledAIs.length > 1 ,
				click : () => {
					void Reaxel_View().turnToPreviousAiPage();
				},
			},
			{
				label : createAdjacentAIMenuLabel( '⏭️' , t( 'Next' ) , nextAI ) ,
				accelerator : 'CmdOrCtrl+]' ,
				registerAccelerator : false ,
				enabled : enabledAIs.length > 1 ,
				click : () => {
					void Reaxel_View().turnToNextAiPage();
				},
			} ,
		] );
	}
	
	function createClickMenuHandler( aiId:string ) {
		return () => {
			reaxel_AIViews().showAIView( aiId , getRuntimeSettings() );
			rebuildMenu();
		};
	}
	
	function rebuildMenu() {
		console.log('[Menu] rebuildMenu called, i18nInstance =', i18nInstance ? 'SET' : 'NULL');
		if( !mainWindow || mainWindow.isDestroyed() ) return;
		mainWindow.setMenu( createMenu() );
	}
	
	const menuReady = Promise.resolve();
	
	obsReaction( ( first ) => {
		if( first ) return;
		rebuildMenu();
	} , () => [
		Reaxel_View.store.currentAIViewKey ,
		Reaxel_View.store.settingsViewOpened,
		reaxel_PromptViews.store.left.visible ,
		reaxel_PromptViews.store.right.visible,
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

const resolveAdjacentMenuAI = (
	enabledAIs:Settings['AIs'] ,
	currentAIViewKey:string ,
	offset:number,
) => {
	if( enabledAIs.length === 0 ) {
		return null;
	}
	const currentIndex = enabledAIs.findIndex( ai => ai.id === currentAIViewKey );
	const baseIndex = currentIndex === -1
		? offset > 0 ? -1 : 0
		: currentIndex;
	return enabledAIs[getWrappedIndex( baseIndex + offset , enabledAIs.length )];
};

const getWrappedIndex = (index:number , length:number) => {
	return ( index + length ) % length;
};

const createPlainMenuLabel = (label:string) => {
	return escapeElectronMenuBarLabel( label.trim() );
};

const createAdjacentAIMenuLabel = (
	emoji:string ,
	label:string ,
	ai:Settings['AIs'][number] | null,
) => {
	if( !ai ) {
		return escapeElectronMenuBarLabel( `${ emoji } ${ label }` );
	}
	return escapeElectronMenuBarLabel( `${ emoji } ${ label } ${ fitMenuAIName( ai.label || ai.id ) }` );
};

import { Reaxel_View } from '../Views';
import {
	escapeElectronMenuBarLabel ,
	fitMenuAIName,
} from './menu-label-width';
import {
	autoUpdater ,
	dialog ,
	Menu,
} from 'electron';
import { mainWindow } from "#main/mainWindow";
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import { getAIConfigService } from "#main/services/settings/ai-config-service";
import { getSettingsConfigService } from "#main/services/settings/settings-config-service";
import type { Settings } from "#src/Types/SettingsTypes";
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from 'reaxes';
