export const reaxel_Menu = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {} );

	let i18nInstance: (() => { i18n: (text: string) => string }) | null = null;
	let menuUpdateScheduled = false;

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

	/**
	 * 生成可序列化的菜单结构数据（替代 createMenu 的 native Menu 构建）
	 * 供 MenuView WebContentsView 使用，通过 IPC 下发到渲染进程。
	 */
	function createMenuData(): MenuView.Structure {
		const settings = getRuntimeSettings();
		const enabledAIs = settings.AIs.filter( ai => !ai.disabled );
		const { currentAIViewKey } = Reaxel_View.store;
		const instantiatedAIViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		const canSwitchInstantiatedAI = instantiatedAIViews.length > 1;
		const promptViewLeftVisible = reaxel_PromptViews.store.left.visible || reaxel_PromptViews.store.left.width > 0;
		const promptViewRightVisible = reaxel_PromptViews.store.right.visible || reaxel_PromptViews.store.right.width > 0;
		const platform = process.platform;

		return [
			{
				id : 'application' ,
				label : t('Application') ,
				enabled : true ,
				submenu : [
					{
						id : 'settings' ,
						label : t('Settings') ,
						type : 'normal' ,
						enabled : true ,
						action : 'open-settings',
					} ,
					{ id : 'app-sep-1' , label : '' , type : 'separator' , enabled : true } ,
					{
						id : 'check-updates' ,
						label : t('Check for Updates') ,
						type : 'normal' ,
						enabled : true ,
						action : 'check-updates',
					} ,
					{ id : 'app-sep-2' , label : '' , type : 'separator' , enabled : true } ,
					{
						id : 'quit' ,
						label : platform === 'darwin' ? t('Quit') : t('Exit') ,
						type : 'normal' ,
						enabled : true ,
						action : 'quit',
					} ,
				],
			} ,
			{
				id : 'view' ,
				label : t('View') ,
				enabled : true ,
				submenu : [
					{
						id : 'reload' ,
						label : t('Reload') ,
						type : 'normal' ,
						accelerator : 'CmdOrCtrl+R' ,
						enabled : true ,
						action : 'reload-view',
					} ,
					{
						id : 'force-reload' ,
						label : t('Force Reload') ,
						type : 'normal' ,
						accelerator : 'CmdOrCtrl+Shift+R' ,
						enabled : true ,
						action : 'force-reload-view',
					} ,
					{
						id : 'devtools' ,
						label : t('Developer Tools') ,
						type : 'normal' ,
						accelerator : platform === 'darwin' ? 'Cmd+Option+I' : 'F12' ,
						enabled : true ,
						action : 'toggle-devtools',
					} ,
					{ id : 'view-sep-1' , label : '' , type : 'separator' , enabled : true } ,
					{
						id : 'prompt-left' ,
						label : t('PromptView Left') ,
						type : 'checkbox' ,
						checked : promptViewLeftVisible ,
						accelerator : 'Alt+,' ,
						enabled : true ,
						action : 'toggle-prompt-left',
					} ,
					{
						id : 'prompt-right' ,
						label : t('PromptView Right') ,
						type : 'checkbox' ,
						checked : promptViewRightVisible ,
						accelerator : 'Alt+.' ,
						enabled : true ,
						action : 'toggle-prompt-right',
					} ,
					{ id : 'view-sep-2' , label : '' , type : 'separator' , enabled : true } ,
					{
						id : 'wipe-reload' ,
						label : t('Wipe and Reload This Page') ,
						type : 'normal' ,
						enabled : true ,
						action : 'wipe-reload',
					} ,
					{ id : 'view-sep-3' , label : '' , type : 'separator' , enabled : true } ,
					{
						id : 'actual-size' ,
						label : t('Actual Size') ,
						type : 'normal' ,
						enabled : true ,
						action : 'actual-size',
					} ,
					{
						id : 'zoom-in' ,
						label : t('Zoom In') ,
						type : 'normal' ,
						accelerator : 'CmdOrCtrl+=' ,
						enabled : true ,
						action : 'zoom-in',
					} ,
					{
						id : 'zoom-out' ,
						label : t('Zoom Out') ,
						type : 'normal' ,
						enabled : true ,
						action : 'zoom-out',
					} ,
					{ id : 'view-sep-4' , label : '' , type : 'separator' , enabled : true } ,
					{
						id : 'toggle-fullscreen' ,
						label : t('Toggle Fullscreen') ,
						type : 'normal' ,
						enabled : true ,
						action : 'toggle-fullscreen',
					} ,
					{ id : 'view-sep-5' , label : '' , type : 'separator' , enabled : true } ,
					{
						id : 'close-current-ai' ,
						label : t('Close This AI') ,
						type : 'normal' ,
						accelerator : 'CmdOrCtrl+W' ,
						enabled : !!reaxel_AIViews().currentAIView ,
						action : 'close-current-ai',
					} ,
				],
			} ,
			{
				id : 'switch-ai' ,
				label : t('Switch AI') ,
				enabled : true ,
				submenu : enabledAIs.length > 0
					? [
						...enabledAIs.map( ai => ( {
							id : `ai-${ ai.id }` ,
							label : ai.label || ai.id ,
							type : 'radio' as const ,
							checked : currentAIViewKey === ai.id ,
							enabled : true ,
							icon : isAIInstantiated( ai.id ) ? '✅' : undefined ,
							action : 'switch-ai' as const ,
							actionPayload : ai.id,
						} ) ) ,
						{ id : 'switch-sep-1' , label : '' , type : 'separator' , enabled : true } ,
						{
							id : 'prev-instantiated' ,
							label : t('Previous Opened AI') ,
							type : 'normal' ,
							accelerator : 'CmdOrCtrl+[' ,
							enabled : canSwitchInstantiatedAI ,
							action : 'prev-instantiated',
						} ,
						{
							id : 'next-instantiated' ,
							label : t('Next Opened AI') ,
							type : 'normal' ,
							accelerator : 'CmdOrCtrl+]' ,
							enabled : canSwitchInstantiatedAI ,
							action : 'next-instantiated',
						} ,
						{ id : 'switch-sep-2' , label : '' , type : 'separator' , enabled : true } ,
						{
							id : 'prev-page' ,
							label : t('Previous AI Page') ,
							type : 'normal' ,
							accelerator : 'Alt+[' ,
							enabled : enabledAIs.length > 1 ,
							action : 'prev-page',
						} ,
						{
							id : 'next-page' ,
							label : t('Next AI Page') ,
							type : 'normal' ,
							accelerator : 'Alt+]' ,
							enabled : enabledAIs.length > 1 ,
							action : 'next-page',
						} ,
					]
					: [
						{
							id : 'no-ai' ,
							label : t('No enabled AI pages') ,
							type : 'normal' ,
							enabled : false,
						} ,
					],
			} ,
		];
	}

	function createMenu() {
		const settings = getRuntimeSettings();
		const enabledAIs = settings.AIs.filter( ai => !ai.disabled );
		const { currentAIViewKey } = Reaxel_View.store;
		const instantiatedAIViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		const canSwitchInstantiatedAI = instantiatedAIViews.length > 1;
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
		if( process.platform === 'darwin' ) {
			const menu = createMenu();
			Menu.setApplicationMenu( menu );
		} else {
			if( !mainWindow || mainWindow.isDestroyed() ) return;
			mainWindow.setMenu( null );
		}
		pushMenuUpdate();
	}

	/**
	 * 发送菜单结构数据到 MenuView 渲染进程
	 */
	function pushMenuUpdate() {
		try {
			const menuViewReaxel = reaxel_MenuView();
			if( menuViewReaxel ) {
				menuViewReaxel.sendMenuStructure();
				menuViewReaxel.ensureLayerOrder();
				setImmediate( () => {
					menuViewReaxel.ensureLayerOrder();
				} );
			}
		} catch ( e ) {
			// MenuView reaxel 可能尚未初始化，静默忽略
		}
	}

	/**
	 * 调度菜单更新（去重）
	 */
	function scheduleMenuUpdate() {
		if( menuUpdateScheduled ) return;
		menuUpdateScheduled = true;
		setImmediate( () => {
			menuUpdateScheduled = false;
			rebuildMenu();
		} );
	}

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
		createMenuData ,
		rebuildMenu,
		scheduleMenuUpdate,
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
	const displayName = ai.label || ai.id;
	return escapeElectronMenuBarLabel( `${ emoji } ${ label }: ${ fitMenuAIName( displayName ) }` );
};

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
import { reaxel_MenuView } from '../Views/Menu-View';
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
import type { MenuView } from "#src/Types/MenuView";
import type { Settings } from "#src/Types/SettingsTypes";
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from 'reaxes';
