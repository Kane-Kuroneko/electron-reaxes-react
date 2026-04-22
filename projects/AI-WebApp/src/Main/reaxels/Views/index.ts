
export const Reaxel_View = reaxel( () => {
	const electronStore = new ElectronStore<{
		previously_used_ai: AI,
		preload_ai_families: AI[], // 存储需要预加载的AI family列表
	}>( { name : "previously-used-ai" } );
	const previously_used_ai = electronStore.get( "previously_used_ai" ) || "chatgpt";
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		currentAIViewKey : checkAs<AI>(previously_used_ai||"chatgpt") ,
		settingsViewOpened : false,
	} );
	
	function fitWindow(target?:AI) {
		const viewSetBounds = (view:WebContentsView) => view?.setBounds( {
			x : 0 ,
			y : 0 ,
			width : mainWindow.getContentBounds().width ,
			height : mainWindow.getContentBounds().height ,
		} );
		
		if(target){
			const {view} = reaxel_AIViews.store.AIViews.find( ({AIName}) => AIName === target );
			viewSetBounds(view);
			return;
		}
		AIKeys.forEach( name => {
			const {view} = reaxel_AIViews.store.AIViews.find( ({AIName}) => AIName === name );
			if( view ) {
				viewSetBounds( view );
			}
		} );
		viewSetBounds(reaxel_SettingsView.store.settingsView.view);
	}
	
	function onReadyLoadAIView(){
		const { initAIView } = reaxel_AIViews();
		if(AIKeys.find(it => it === store.currentAIViewKey)){
			initAIView(store.currentAIViewKey as AI);
		}
	}
	
	// 预加载所有标记为preloadOnStartup的AI Views
	function preloadStartupAIViews(){
		const { initAIView } = reaxel_AIViews();
		
		// 从electronStore获取需要预加载的AI family列表
		const preloadAIFamilies = electronStore.get( "preload_ai_families" ) || [];
		
		// 为每个需要预加载的AI初始化view
		preloadAIFamilies.forEach(aiFamily => {
			// 验证AI family是否有效
			if(AIKeys.find(key => key === aiFamily)) {
				initAIView(aiFamily as AI);
			}
		});
	}
	
	app.whenReady().then(() => {
		onReadyLoadAIView();
		// 延迟预加载,确保所有view都已初始化
		setTimeout(() => {
			preloadStartupAIViews(); // 预加载标记为启动加载的AI Views
		}, 500);
		mainWindow.on( 'resize' , () => {
			fitWindow();
		} );
		
		// 监听来自Renderer进程的预加载配置更新
		useIpcRendererToMain('update-preload-ai-config').on(({event}, preloadAIFamilies: AI[]) => {
			electronStore.set('preload_ai_families', preloadAIFamilies);
		});
	});
	
	//当用户切换时重新创建menu并渲染
	obsReaction( ( first ) => {
		if( first ) return;
		if(AIKeys.find(it => it === store.currentAIViewKey)){
			
			electronStore.set( "previously_used_ai" , store.currentAIViewKey );
		}
	} , () => [ store.currentAIViewKey ] );
	
	obsReaction((first) => {
		if(first) return;
		
		reaxel_SettingsView.store.settingsView.view?.setVisible(store.settingsViewOpened);
		
		reaxel_AIViews.store.AIViews.forEach(( { view,AIName }) => {
			if(store.settingsViewOpened){
				view?.setVisible(false);
			}else {
				if(!view) return;
				const match = AIName === store.currentAIViewKey;
				view.setVisible( match );
				if(match){
					// 退出settings頁面後立刻使当前AI的view获取焦点,否则无法正确触发menu的菜单点击事件
					view.webContents.focus();
				}
			}
		});
	},() => [store.settingsViewOpened]);
	
	const rtn = {};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );


import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import {
	app ,
	WebContentsView,
} from "electron";
import {
	AI ,
	AIKeys ,
} from "#main/reaxels/Views/AI-Views/data";
import ElectronStore from "electron-store";
import { mainWindow } from "#main/mainWindow";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
import { useIpcRendererToMain } from "#main/services/ipc";
