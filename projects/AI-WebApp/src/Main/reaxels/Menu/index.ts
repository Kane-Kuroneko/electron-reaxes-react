export const reaxel_Menu = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		
	} );
	
	function createMenu (){
		const { currentAIViewKey } = Reaxel_View.store;
		return Menu.buildFromTemplate( [
			{
				label : 'Application' ,
				submenu : [
					{
						label : `[${Reaxel_View.store.settingsViewOpened ? '✔️' :''}Settings]`,
						click(){
							Reaxel_View.setState({settingsViewOpened : true});
							const settingsView = reaxel_SettingsView().initSettingsView();
							settingsView.setVisible(true);
							mainWindow.contentView.addChildView(settingsView);
						}
					},
					{ type: 'separator' },
					{
						label : "Check for Updates" ,
						click : () => {
							autoUpdater.checkForUpdates();
						} ,
					} ,
					{ type: 'separator' },
					{
						role : 'quit' ,
					} ,
				] ,
				
			} ,
			{
				label : 'View',
				submenu : [
					{
						label : 'Reload' ,
						accelerator:'ctrl+r',
						click : () => {
							if( Reaxel_View.store.settingsViewOpened ) {
								var view = reaxel_SettingsView.store.settingsView.view;
							} else {
								var view = reaxel_AIViews().currentAIView?.view;
							}
							if( !view ) return;
							view.webContents.reload();
						} ,
					} ,
					{
						label : 'Force Reload' ,
						accelerator:'ctrl+shift+r',
						click : () => {
							if( Reaxel_View.store.settingsViewOpened ) {
								const { view } = reaxel_SettingsView.store.settingsView;
								view.webContents.reloadIgnoringCache();
							} else {
								//还要强行重置域名
								const {
									view ,
									domain,
								} = reaxel_AIViews().currentAIView ?? {};
								view?.webContents.loadURL( domain );
							}
						} ,
					} ,
					{
						label : 'Developer Tools' ,
						accelerator:'f12',
						click : () => {
							if( Reaxel_View.store.settingsViewOpened ) {
								reaxel_SettingsView.store.settingsView.view.webContents.toggleDevTools();
							} else {
								const { currentAIView } = reaxel_AIViews();
								currentAIView?.view.webContents.toggleDevTools();
							}
						} ,
					} ,
					{
						label : 'Wipe and Reload This Page' ,
						click : async() => {
							const result = await dialog.showMessageBox({
								type : 'warning',
								message : 'This operation will clear all authentication data from the current page and reload it. \r\nInclude cookies, local storage, and other data.',
								buttons : [ 'Yes', 'No' ],
								cancelId : 1,
								defaultId : 0,
							});
							
							if( result.response !== 0 ) return;
							
							const { currentAIView } = reaxel_AIViews();
							if( !currentAIView ) return;
							const { origin } = new URL( currentAIView.view.webContents.getURL() );
							
							await currentAIView.view.webContents.clearHistory();
							//清除任何Domain和会话数据
							await currentAIView.view.webContents.session.clearStorageData( { origin } );
							await currentAIView.view.webContents.session.clearCache();
							await currentAIView.view.webContents.session.clearData( { origins : [ origin ] } );
							await currentAIView.view.webContents.session.clearAuthCache();
							currentAIView.view.webContents.reloadIgnoringCache();
						} ,
					} ,
					{ type : 'separator' } ,
					{
						role : 'resetZoom' ,
					} ,
					{ role : 'zoomIn' } ,
					{ role : 'zoomOut' } ,
					{ type : 'separator' } ,
					{ role : 'togglefullscreen' },
				],
				
				
			},
			{
				label : "Switch AI" ,
				submenu : AIKeys.map( name => {
					const { label } = AIData.find( ({AIName}) => AIName === name);
					return {
						label ,
						type : 'radio' ,
						checked : currentAIViewKey === name ,
						click : createClickMenuHandler( name ) ,
					};
				} ) ,
			} ,
		] );
	};
	
	function createClickMenuHandler( name: AI ) {
		return () => {
			AIKeys.forEach( _name => {
				
				const {view} = reaxel_AIViews.store.AIViews.find( ({AIName}) => AIName === _name );
				const { initAIView} = reaxel_AIViews();
				if(_name !== name){
					if(view){
						view.setVisible( false );
					}
				}else {
					if(view){
						view.setVisible( true );
					}else {
						var newView = initAIView(_name);
					}
					(view??newView).webContents.focus();
				}
			} );
			
			//当设置页面打开时页面不会变化,但是在后台切换AI
			if(Reaxel_View.store.settingsViewOpened){
				mainWindow.contentView.addChildView(reaxel_SettingsView.store.settingsView.view);
			}
			Reaxel_View.setState({currentAIViewKey : name});
		};
	}
	
	
	
	const menuReady = app.whenReady().then( async() => {
		const menu = createMenu();
		mainWindow.setMenu(menu);
	} );
	
	//当用户切换时重新创建menu并渲染
	obsReaction( ( first ) => {
		if( first ) return;
		const menu = createMenu();
		mainWindow.setMenu(menu);
	} , () => [ Reaxel_View.store.currentAIViewKey,Reaxel_View.store.settingsViewOpened ] );
		
	const rtn = {
		menuReady,
		createMenu,
	};
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate ,
	} );
} );

import { Reaxel_View } from '../Views';
import {
	app ,
	autoUpdater ,
	Menu ,
	View,
	dialog,
} from 'electron';
import { mainWindow } from "#main/mainWindow";
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import {
	AI ,
	AIData ,
	AIKeys ,
} from "#main/reaxels/Views/AI-Views/data";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
