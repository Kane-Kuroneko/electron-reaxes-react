
const { absAppRunningPath } = reaxel_ElectronENV();

export const initWebContentsView = (options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	
	const viewOptions = normalizeViewOptions( options );
	const view = new WebContentsView(viewOptions);
	applyInitialViewBackground( view , viewOptions );
	if( dev() ) {
		useBeautifulDevtool( view );
	}
	view.webContents.setVisualZoomLevelLimits(1,5);
	mainWindow.contentView.addChildView(view);
	
	// 初始化崩溃报告器
	const viewName = options.type === 'AI-View' ? `AI-View-${options.domain || 'unknown'}` : 'Settings-View';
	new ViewCrashReporter(view, viewName);
	
	if(viewOptions.type==='Settings-View'){
		useSettingsView(view, options);
	}else if(viewOptions.type==='AI-View'){
		useAIView(view, viewOptions);
	}
	
	//让View跟随主窗口大小
	const { width , height } = mainWindow.getContentBounds();
	view.setBounds( { x: 0, y: 0, width, height} );
	//太TMD蠢了!直接获取窗口大小的时候因为Menu的原因获取到的是错的!必须要重新获取并设置一遍
	view.webContents.on( 'did-finish-load' , () => {
		const {
			width ,
			height,
		} = mainWindow.getContentBounds();
		view.setBounds( {
			x : 0 ,
			y : 0 ,
			width ,
			height,
		} );
	} );
	
	//当用户ctrl+r时reload当前view;f12 devtools
	view.webContents.on('before-input-event', (event, input) => {
		if( handleAISwitchShortcutInput( event , input ) ) {
			return;
		}
		// if (input.control && input.key.toLowerCase() === 'r') {
		// 	if (input.shift) {
		// 		// Ctrl+Shift+R 强制重置域名
		// 		view.webContents.loadURL(options.domain || "https://chatgpt.com");
		// 	} else {
		// 		// Ctrl+R 重新加载当前页面
		// 		view.webContents.reload();
		// 	}
		// }
	});
	
	return view;
}

const useSettingsView = (view:WebContentsView,options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	if(dev()){
		~async function loadDevSettingsView() {
			const loaded = await safeLoadURL( view , createDevRendererURL( 'SettingsView' ) , 'Settings-View' );
			if( !loaded ) {
				console.error( '[Views] Settings-View dev server is unavailable. Run webpack.start before electron.start.' );
			}
		}();
	}else {
		void safeLoadFile( view , path.join(absAppRunningPath,`./renderer/SettingsView/index.html`) , 'Settings-View' );
	}
	
}
const useAIView = (view:WebContentsView,options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	view.webContents.setWindowOpenHandler(({ url }) => {
		if( shouldOpenInCurrentView( view.webContents.getURL() || options.domain , url ) ) {
			void safeLoadURL( view , url , `AI-View popup:${ options.aiConfig?.id || 'unknown' }` );
			return { action : 'deny' };
		}
		shell.openExternal(url);
		return { action: 'deny' };
	});
	~async function loadAIView() {
		try {
			console.log( '[Views] Loading AI view:' , options.aiConfig?.id , options.domain );
			if( options.aiConfig && options.settings ) {
				await applyAIProxyToView( view , options.aiConfig , options.settings );
				applyAIPageAppearanceToView( view , options.settings.appearance );
			}
			await safeLoadURL( view , options.domain || "https://chatgpt.com" , `AI-View:${ options.aiConfig?.id || 'unknown' }` );
		} catch ( error ) {
			console.warn( '[Views] AI view load pipeline failed:' , options.aiConfig?.id , error );
		}
	}();
};

const safeLoadURL = async(
	view:WebContentsView ,
	url:string ,
	context:string,
) => {
	try {
		await view.webContents.loadURL( url , getFreshLoadURLOptions( url ) );
		return true;
	} catch ( error ) {
		console.warn( `[Views] ${ context } loadURL failed:` , url , error );
		return false;
	}
};

const safeLoadFile = async(
	view:WebContentsView ,
	filePath:string ,
	context:string,
) => {
	try {
		await view.webContents.loadFile( filePath );
		return true;
	} catch ( error ) {
		console.warn( `[Views] ${ context } loadFile failed:` , filePath , error );
		return false;
	}
};

const createDevRendererURL = (entry:string) => {
	return `https://localhost:${ __DEV_PORT__ }/${ entry }?t=${ Date.now() }`;
};

const getFreshLoadURLOptions = (url:string) => {
	if( !dev() || !url.startsWith( `https://localhost:${ __DEV_PORT__ }/` ) ) {
		return undefined;
	}
	return {
		extraHeaders : [
			'Cache-Control: no-cache',
			'Pragma: no-cache',
		].join( '\n' ),
	};
};

const normalizeViewOptions = (options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	if( options.type !== 'AI-View' ) {
		return options;
	}
	return {
		...options ,
		webPreferences : {
			nodeIntegration : false ,
			contextIsolation : true ,
			...( options.webPreferences || {} ) ,
			preload : path.join( absAppRunningPath , 'ai-page-preload.js' ) ,
		},
	};
};

const applyInitialViewBackground = (
	view:WebContentsView ,
	options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions,
) => {
	if( options.type !== 'AI-View' || !options.settings ) {
		return;
	}
	view.setBackgroundColor( getAIPageBackgroundColor( options.settings.appearance ) );
};

const shouldOpenInCurrentView = (currentURL:string , nextURL:string) => {
	try {
		return new URL( currentURL ).origin === new URL( nextURL ).origin;
	} catch ( error ) {
		return false;
	}
};

import {
	shell ,
	WebContentsView,
	dialog,
	type WebContentsViewConstructorOptions,
} from 'electron';
import { mainWindow } from "#main/mainWindow";
import * as path from "path";
import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import {dev} from 'electron-is';
import { ViewCrashReporter } from "#main/reaxels/Views/AI-Views/crash-reporter";
import { applyAIProxyToView } from "#main/services/settings/proxy-service";
import { handleAISwitchShortcutInput } from '#main/services/shortcuts/ai-switch';
import { useBeautifulDevtool } from '#generics/modify-electron/beautiful-devtool';
import {
	applyAIPageAppearanceToView ,
	getAIPageBackgroundColor ,
} from '#main/services/appearance';
import type { Settings } from "#src/Types/SettingsTypes";
import type { AI as AISettings } from "#src/Types/SettingsTypes/AI";

type AI = "chatgpt"|"grok"|"gemini"|"deepseek"|"perplexity";
type ExtraBrowserWindowOptions = {
	domain? : string;
	type : "AI-View"|"Settings-View";
	aiConfig?: AISettings.AIItem;
	settings?: Settings;
}
