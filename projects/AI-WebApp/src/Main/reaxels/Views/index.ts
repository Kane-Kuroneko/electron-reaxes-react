export const Reaxel_View = reaxel( () => {
	const electronStore = new ElectronStore<{
		previously_used_ai: AI,
	}>( { name : "previously-used-ai" } );
	const previously_used_ai = electronStore.get( "previously_used_ai" ) || "chatgpt";
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		currentViewName : checkAs<AI|"Settings">(previously_used_ai||"chatgpt") ,
	} );
	
	function fitWindow(target?:AI) {
		
		if(target){
			const {view,} = reaxel_AIViews.store.AIViews.find( ({AIName}) => AIName === target );
			view.setBounds( {
				x : 0 ,
				y : 0 ,
				width : mainWindow.getContentBounds().width ,
				height : mainWindow.getContentBounds().height ,
			} );
			return;
		}
		AIKeys.forEach( name => {
			const {view} = reaxel_AIViews.store.AIViews.find( ({AIName}) => AIName === name );
			if( view ) {
				view.setBounds( {
					x : 0 ,
					y : 0 ,
					width : mainWindow.getContentBounds().width ,
					height : mainWindow.getContentBounds().height ,
				} );
			}
		} );
	}
	
	function onReadyLoadAIView(){
		const { initAIView } = reaxel_AIViews();
		if(AIKeys.find(it => it === store.currentViewName)){
			initAIView(store.currentViewName as  AI);
		}
	}
	
	app.whenReady().then(() => {
		onReadyLoadAIView();
		mainWindow.on( 'resize' , () => {
			fitWindow();
		} );
	});
	
	//当用户切换时重新创建menu并渲染
	obsReaction( ( first ) => {
		if( first ) return;
		if(AIKeys.find(it => it === store.currentViewName)){
			
			electronStore.set( "previously_used_ai" , store.currentViewName );
		}
	} , () => [ store.currentViewName ] );
	
	const rtn = {};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );



import { app } from "electron";
import {
	AI ,
	AIKeys ,
} from "#main/reaxels/Views/AI-Views/data";
import ElectronStore from "electron-store";
import { mainWindow } from "#main/mainWindow";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
