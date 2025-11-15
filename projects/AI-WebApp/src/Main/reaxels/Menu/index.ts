export const reaxel_Menu = reaxel( () => {
	
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		
	} );
	
	function createMenu (){
		const { currentViewName } = Reaxel_View.store;
		return Menu.buildFromTemplate( [
			{
				label : 'Application' ,
				submenu : [
					{
						label : 'Settings',
						click : () => {
							//todo
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
						label : 'Reload',
						click : () => {
							const { currentAIView } = reaxel_AIViews();
							if(!currentAIView) return;
							
							currentAIView.view.webContents.reload();
						}
					},
					{
						label : 'Force Reload',
						click : () => {
							const { currentAIView } = reaxel_AIViews();
							if(!currentAIView) return;
							
							currentAIView.view.webContents.reloadIgnoringCache();
							//还要强行重置域名
							currentAIView.view.webContents.loadURL(currentAIView.domain);
						}
					},
					{
						label : 'Developer Tools',
						click : () => {
							const { currentAIView } = reaxel_AIViews();
							if(!currentAIView) return;
							currentAIView.view.webContents.toggleDevTools();
						}
					},
					{
						label : 'Wipe and Reload This Page',
						click : async () => {
							const { currentAIView } = reaxel_AIViews();
							if(!currentAIView) return;
							const {origin} = new URL(currentAIView.view.webContents.getURL());
							
							await currentAIView.view.webContents.clearHistory();
							//清除任何Domain和会话数据
							await currentAIView.view.webContents.session.clearStorageData({origin});
							await currentAIView.view.webContents.session.clearCache();
							await currentAIView.view.webContents.session.clearData({origins:[origin]});
							await currentAIView.view.webContents.session.clearAuthCache();
							currentAIView.view.webContents.reloadIgnoringCache();
						}
					},
					{ type : 'separator' } ,
					{ role : 'resetZoom' } ,
					{ role : 'zoomIn' } ,
					{ role : 'zoomOut' } ,
					{ type : 'separator' } ,
					{ role : 'togglefullscreen'}
				],
				
			},
			{
				label : '[Settings]',
				click(){
					
				}
			},
			{
				label : "Switch AI" ,
				submenu : AIKeys.map( name => {
					const { label } = AIData.find( ({AIName}) => AIName === name);
					return {
						label ,
						type : 'radio' ,
						checked : currentViewName === name ,
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
				if(view) {
					if(_name !== name){
						view.setVisible( false );
					}else {
						view.setVisible( true );
					}	
				}else {
					initAIView(_name);
				}
				
			} );
			Reaxel_View.setState({currentViewName : name});
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
	} , () => [ Reaxel_View.store.currentViewName ] );
	
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
} from 'electron';
import { mainWindow } from "#main/mainWindow";
import {
	AI ,
	AIData ,
	AIKeys ,
} from "#main/reaxels/Views/AI-Views/data";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
