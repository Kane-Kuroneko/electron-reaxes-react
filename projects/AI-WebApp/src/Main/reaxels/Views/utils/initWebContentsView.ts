
const { absAppRunningPath } = reaxel_ElectronENV();

export const initWebContentsView = (options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	
	const viewOptions = normalizeViewOptions( options );
	const view = new WebContentsView(viewOptions);
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
		view.webContents.loadURL(`https://localhost:${__DEV_PORT__}/SettingsView`)
	}else {
		view.webContents.loadFile(path.join(absAppRunningPath,`./renderer/SettingsView/index.html`))
	}
	
}
const useAIView = (view:WebContentsView,options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	view.webContents.setWindowOpenHandler(({ url }) => {
		if( shouldOpenInCurrentView( view.webContents.getURL() || options.domain , url ) ) {
			view.webContents.loadURL( url );
			return { action : 'deny' };
		}
		shell.openExternal(url);
		return { action: 'deny' };
	});
	~async function loadAIView() {
		if( options.aiConfig && options.settings ) {
			await applyAIProxyToView( view , options.aiConfig , options.settings );
			applyAIPageAppearanceToView( view , options.settings.appearance );
		}
		await view.webContents.loadURL( options.domain || "https://chatgpt.com" );
	}();
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
			additionalArguments : options.settings
				? getAIPagePreloadArguments( options.settings.appearance )
				: [],
		},
	};
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
import {
	applyAIPageAppearanceToView ,
	getAIPagePreloadArguments,
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
