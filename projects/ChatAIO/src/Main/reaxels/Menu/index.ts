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
		const instantiatedAIViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		const canSwitchInstantiatedAI = instantiatedAIViews.length > 1;
		// 顶部相邻按钮基于已实例化的 AI Views
		const nextInstantiatedAI = resolveAdjacentInstantiatedAI( instantiatedAIViews , currentAIViewKey , 1 );
		const previousInstantiatedAI = resolveAdjacentInstantiatedAI( instantiatedAIViews , currentAIViewKey , -1 );
		const promptViewLeftVisible = reaxel_PromptViews.store.left.visible || reaxel_PromptViews.store.left.width > 0;
		const promptViewRightVisible = reaxel_PromptViews.store.right.visible || reaxel_PromptViews.store.right.width > 0;
		const adjacentAIMenuItems:MenuItemConstructorOptions[] = canSwitchInstantiatedAI
			? [
				{
					label : createAdjacentAIMenuLabel( '⏮️' , t( 'Prev' ) , previousInstantiatedAI ) ,
					accelerator : 'CmdOrCtrl+[' ,
					registerAccelerator : false ,
					click : () => {
						void Reaxel_View().turnToPreviousInstantiatedAiPage();
					},
				} ,
				{
					label : createAdjacentAIMenuLabel( '⏭️' , t( 'Next' ) , nextInstantiatedAI ) ,
					accelerator : 'CmdOrCtrl+]' ,
					registerAccelerator : false ,
					click : () => {
						void Reaxel_View().turnToNextInstantiatedAiPage();
					},
				} ,
			]
			: [];

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
							Reaxel_View().fitWindow();
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
						label : process.platform === 'darwin' ? t('Quit') : t('Exit') ,
						role : 'quit',
					},
				],
			} ,
			// macOS 标准 Edit 菜单 — 使用 Electron role 提供原生 AppKit 行为、系统语言本地化和标准快捷键
			...( process.platform === 'darwin' ? [{
				label : t('Edit') ,
				submenu : [
					{ role : 'undo' as const } ,
					{ role : 'redo' as const } ,
					{ type : 'separator' as const } ,
					{ role : 'cut' as const } ,
					{ role : 'copy' as const } ,
					{ role : 'paste' as const } ,
					{ role : 'pasteAndMatchStyle' as const } ,
					{ role : 'delete' as const } ,
					{ type : 'separator' as const } ,
					{ role : 'selectAll' as const } ,
				],
			}] : [] ) ,
			{
				label : t('View') ,
				submenu : [
					{
						label : t('Reload') ,
						accelerator : 'CmdOrCtrl+R' ,
						click : () => {
							const view = Reaxel_View.store.settingsViewOpened
								? reaxel_SettingsView.store.settingsView.view
								: reaxel_AIViews().currentAIView?.view;
							view?.webContents.reload();
						} ,
					} ,
					{
						label : t('Force Reload') ,
						accelerator : 'CmdOrCtrl+Shift+R' ,
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
						// Windows: F12（Chrome 标准），macOS: Cmd+Option+I（Chrome 标准）
							accelerator : process.platform === 'darwin' ? 'Cmd+Option+I' : 'F12' ,
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
					{
						label : t('Actual Size') ,
						click : () => {
							const view = reaxel_AIViews().currentAIView?.view;
							if( view && !view.webContents.isDestroyed() ) {
								view.webContents.setZoomLevel( 0 );
							}
						},
					} ,
					{
						label : t('Zoom In') ,
						accelerator : 'CmdOrCtrl+=' ,
						click : () => {
							const view = reaxel_AIViews().currentAIView?.view;
							if( view && !view.webContents.isDestroyed() ) {
								const currentZoom = view.webContents.getZoomLevel();
								view.webContents.setZoomLevel( currentZoom + 0.5 );
							}
						},
					} ,
					{
						label : t('Zoom Out') ,
						click : () => {
							const view = reaxel_AIViews().currentAIView?.view;
							if( view && !view.webContents.isDestroyed() ) {
								const currentZoom = view.webContents.getZoomLevel();
								view.webContents.setZoomLevel( currentZoom - 0.5 );
							}
						},
					} ,
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
			// macOS 标准 Window 菜单 — 使用 Electron role 提供原生窗口管理行为
			...( process.platform === 'darwin' ? [{
				label : t('Window') ,
				submenu : [
					{ role : 'minimize' as const } ,
					{ role : 'zoom' as const } ,
					{ type : 'separator' as const } ,
					{ role : 'front' as const } ,
				],
			}] : [] ) ,
			{
				label : t("Switch AI") ,
				submenu : enabledAIs.length
					? [
						...enabledAIs.map( ai => ( {
							label : isAIInstantiated( ai.id )
								? `${ ai.label } ✅️`
								: ai.label ,
							type : 'radio' as const ,
							checked : currentAIViewKey === ai.id ,
							click : createClickMenuHandler( ai.id ),
						} ) ),
						{ type : 'separator' as const } ,
						{
							label : createPlainMenuLabel( t('Previous Opened AI') ) ,
							type : 'normal' as const ,
							accelerator : 'CmdOrCtrl+[' ,
							registerAccelerator : false ,
							enabled : canSwitchInstantiatedAI ,
							click : () => {
								void Reaxel_View().turnToPreviousInstantiatedAiPage();
							},
						} ,
						{
							label : createPlainMenuLabel( t('Next Opened AI') ) ,
							type : 'normal' as const ,
							accelerator : 'CmdOrCtrl+]' ,
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
							accelerator : 'Alt+[' ,
							registerAccelerator : false ,
							enabled : enabledAIs.length > 1 ,
							click : () => {
								void Reaxel_View().turnToPreviousAiPage();
							},
						} ,
						{
							label : createPlainMenuLabel( t('Next AI Page') ) ,
							type : 'normal' as const ,
							accelerator : 'Alt+]' ,
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
			...adjacentAIMenuItems,
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
		const menu = createMenu();
		// macOS：全局应用菜单（始终在屏幕顶部菜单栏可见）
		// Windows/Linux：每窗口菜单
		if( process.platform === 'darwin' ) {
			Menu.setApplicationMenu( menu );
		} else {
			if( !mainWindow || mainWindow.isDestroyed() ) return;
			mainWindow.setMenu( menu );
		}
	}

	/**
	 * 检查给定 AI ID 是否已经被实例化（WebContentsView 已创建）
	 */
	const isAIInstantiated = (aiId:string) => {
		return reaxel_AIViews.store.AIViews.some( rv => rv.id === aiId );
	};

	const menuReady = Promise.resolve();

	obsReaction( ( first ) => {
		if( first ) return;
		rebuildMenu();
	} , () => [
		Reaxel_View.store.currentAIViewKey ,
		Reaxel_View.store.settingsViewOpened,
		reaxel_AIViews.store.AIViews.length ,
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
	ai:Settings['AIs'][number] | RuntimeAIView | null,
) => {
	if( !ai ) {
		return escapeElectronMenuBarLabel( `${ emoji } ${ label }` );
	}
	// 获取 AI 显示名称：优先使用 label，否则使用 id
	const displayName = ai.label || ai.id;
	return escapeElectronMenuBarLabel( `${ emoji } ${ label }: ${ fitMenuAIName( displayName ) }` );
};

/**
 * 基于已实例化的 AI Views 解析相邻 AI
 */
const resolveAdjacentInstantiatedAI = (
	instantiatedViews:RuntimeAIView[] ,
	currentAIViewKey:string ,
	offset:number,
) => {
	if( instantiatedViews.length === 0 ) {
		return null;
	}
	const currentIndex = instantiatedViews.findIndex( view => view.id === currentAIViewKey );
	const baseIndex = currentIndex === -1
		? offset > 0 ? -1 : 0
		: currentIndex;
	return instantiatedViews[getWrappedIndex( baseIndex + offset , instantiatedViews.length )];
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
	type MenuItemConstructorOptions,
} from 'electron';
import { mainWindow } from "#main/mainWindow";
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { reaxel_AIViews , type RuntimeAIView } from "#main/reaxels/Views/AI-Views";
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import { getAIConfigService } from "#main/services/settings/ai-config-service";
import { getSettingsConfigService } from "#main/services/settings/settings-config-service";
import type { Settings } from "#src/Types/SettingsTypes";
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from 'reaxes';
