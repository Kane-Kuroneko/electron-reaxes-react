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
					{ label : t('Toggle Fullscreen') , role : 'togglefullscreen' },
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
							label : t('Previous AI Page') ,
							accelerator : 'CmdOrCtrl+[' ,
							registerAccelerator : false ,
							enabled : enabledAIs.length > 1 ,
							click : () => {
								void Reaxel_View().turnToPreviousAiPage();
							},
						} ,
						{
							label : t('Next AI Page') ,
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

const createAdjacentAIMenuLabel = (
	emoji:string ,
	label:string ,
	ai:Settings['AIs'][number] | null,
) => {
	if( !ai ) {
		return `${ emoji } ${ label }`;
	}
	return `${ emoji } ${ label } ${ fitMenuAIName( ai.label || ai.id ) }`;
};

// Electron 原生菜单无法指定等宽字体,这里用估算宽度和 Unicode 空白尽量降低菜单栏抖动.
const MENU_AI_NAME_WIDTH = 18;
const MENU_AI_NAME_ELLIPSIS = '...';

const fitMenuAIName = (name:string) => {
	const normalizedName = normalizeMenuAIName( name );
	const ellipsisWidth = getMenuTextWidth( MENU_AI_NAME_ELLIPSIS );

	if( getMenuTextWidth( normalizedName ) <= MENU_AI_NAME_WIDTH ) {
		return padMenuTextToWidth( normalizedName , MENU_AI_NAME_WIDTH );
	}

	let fitted = '';
	let fittedWidth = 0;
	for( const char of Array.from( normalizedName ) ) {
		const nextWidth = getMenuCharWidth( char );
		if( fittedWidth + nextWidth + ellipsisWidth > MENU_AI_NAME_WIDTH ) {
			break;
		}
		fitted += char;
		fittedWidth += nextWidth;
	}
	return padMenuTextToWidth( `${ fitted }${ MENU_AI_NAME_ELLIPSIS }` , MENU_AI_NAME_WIDTH );
};

const normalizeMenuAIName = (name:string) => {
	return name.replace( /\s+/g , ' ' ).trim() || 'AI';
};

const padMenuTextToWidth = (text:string , targetWidth:number) => {
	let result = text;
	let remainingWidth = targetWidth - getMenuTextWidth( text );
	for( const space of MENU_WIDTH_SPACES ) {
		while( remainingWidth >= space.width - 0.01 ) {
			result += space.char;
			remainingWidth -= space.width;
		}
	}
	return result;
};

const getMenuTextWidth = (text:string) => {
	return Array.from( text ).reduce( ( width , char ) => {
		return width + getMenuCharWidth( char );
	} , 0 );
};

const getMenuCharWidth = (char:string) => {
	if( /[\u0300-\u036F\u200D\uFE0E\uFE0F]/.test( char ) ) {
		return 0;
	}
	if( char === ' ' ) {
		return 0.35;
	}
	if( MENU_SPACE_WIDTHS[char] ) {
		return MENU_SPACE_WIDTHS[char];
	}
	if( isEmojiLikeChar( char ) || isCJKChar( char ) ) {
		return 2;
	}
	if( /[MW@#%&]/.test( char ) ) {
		return 1.25;
	}
	if( /[A-Z0-9]/.test( char ) ) {
		return 0.95;
	}
	if( /[a-z]/.test( char ) ) {
		return /[ijlrtf]/.test( char )
			? 0.5
			: /[mw]/.test( char )
				? 1.15
				: 0.85;
	}
	if( /[.,'`|:;]/.test( char ) ) {
		return 0.35;
	}
	if( /[-_/\\()[\]{}]/.test( char ) ) {
		return 0.55;
	}
	return 1;
};

const isCJKChar = (char:string) => {
	return /[\u2E80-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/.test( char );
};

const isEmojiLikeChar = (char:string) => {
	return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test( char );
};

const MENU_WIDTH_SPACES = [
	{ char : '\u2003' , width : 1 } ,
	{ char : '\u2007' , width : 0.9 } ,
	{ char : '\u2002' , width : 0.5 } ,
	{ char : '\u00A0' , width : 0.35 } ,
	{ char : '\u202F' , width : 0.2 } ,
	{ char : '\u2009' , width : 0.12 } ,
	{ char : '\u200A' , width : 0.06 },
];

const MENU_SPACE_WIDTHS = MENU_WIDTH_SPACES.reduce( ( result , space ) => {
	result[space.char] = space.width;
	return result;
} , {} as Record<string , number> );

import { Reaxel_View } from '../Views';
import {
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
