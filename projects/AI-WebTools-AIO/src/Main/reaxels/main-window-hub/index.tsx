export const reaxel_MainWindowHub = reaxel(() => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		mainWindow : null as BrowserWindow ,
	} );
	
	obsReaction( (first) => {
		if(store.mainWindow){
			
			useBeautifulDevtool( store.mainWindow );
			
			// store.mainWindow.on('resized',async () => {
			// 	const [gpt,grok] = await Promise.all( [ chatGPTView , grokView ] );
			// 	gpt.controller.resize();
			// })
			// useOpenLinkViaChrome(store.mainWindow);
		}
	} , () => [
		store.mainWindow
	] );
		
	const createMainWindow = async (
		options:BrowserWindowConstructorOptions = {}
	) => {
		await app.whenReady();
		const defaultOptions:BrowserWindowConstructorOptions = {
			width : dev() ? 2000 :1000 ,
			height : dev() ? 1300 : 1400 ,
			webPreferences : {
				nodeIntegration: false,
				contextIsolation: true,
				devTools : true,
				experimentalFeatures : false,
				preload : './preload.js',
			} ,
			
			autoHideMenuBar:true
		};
		// Create the browser window.
		const mainWindow = new BrowserWindow( _.merge(options,defaultOptions));
		
		if(false){
			Promise.all([chatGPTView,grokView]).then(([chatGPT , grok]) => {
				let { height , width } = mainWindow.getContentBounds();
				width = width - 80;
				
				mainWindow.contentView.addChildView(chatGPT.wcv);
				chatGPT.wcv.setBounds( {
					width : width / 2 ,
					height : height ,
					x : 0 + 80 ,
					y : 0 ,
				} );
				mainWindow.contentView.addChildView(grok.wcv);
				grok.wcv.setBounds( {
					width : width / 2 ,
					height : height ,
					x : width / 2 + 80,
					y : 0 ,
				} );
			});
		}
		setState( { mainWindow } );
		return mainWindow;
	};
	createMainWindow();
	const rtn = {
		get mainWindow(){
			return store.mainWindow;
		},
	};
	
	return Object.assign(() => rtn , {
		store ,
		setState ,
		mutate ,
	});
})

import { grokView } from '#main/WebContentsViews/PresetToolViews/Grok';
import { chatGPTView } from '#main/WebContentsViews/PresetToolViews/ChatGPT';
import { useOpenLinkViaChrome } from '#generic/modify-electron/link-handler';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import { dev } from 'electron-is';
import { reaxel_AllocatorController } from '../allocatorView-controller';
import {app, BrowserWindow ,BrowserWindowConstructorOptions} from 'electron';
