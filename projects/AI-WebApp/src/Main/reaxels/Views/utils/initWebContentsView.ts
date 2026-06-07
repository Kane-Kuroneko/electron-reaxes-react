
const { absAppRunningPath } = reaxel_ElectronENV();

export const initWebContentsView = (options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	
	const viewOptions = normalizeViewOptions( options );
	const view = new WebContentsView(viewOptions);
	installWebContentsKeyboardGuard( view.webContents );
	applyInitialViewBackground( view , viewOptions );
	if( dev() ) {
		useBeautifulDevtool( view );
	}
	view.webContents.setVisualZoomLevelLimits(1,5);
	mainWindow.contentView.addChildView(view);
	const refreshBounds = () => {
		if( options.refreshBounds ) {
			options.refreshBounds( view );
			return;
		}
		const { width , height } = mainWindow.getContentBounds();
		view.setBounds( { x: 0, y: 0, width, height} );
	};
	
	// 初始化崩溃报告器
	const viewName = options.type === 'AI-View'
		? `AI-View-${options.domain || 'unknown'}`
		: options.type === 'Prompt-View'
			? options.promptSide === 'right' ? 'PromptViewRight' : 'PromptViewLeft'
			: 'Settings-View';
	new ViewCrashReporter(view, viewName);
	
	if(viewOptions.type==='Settings-View'){
		useSettingsView(view, options);
	}else if(viewOptions.type==='AI-View'){
		useAIView(view, viewOptions);
	}else if(viewOptions.type==='Prompt-View'){
		usePromptView(view, viewOptions);
	}
	
	// 初始兜底布局；AI/Settings 等中心内容可通过 refreshBounds 接入 Reaxel_View 的 inset 布局。
	refreshBounds();
	view.webContents.on( 'did-finish-load' , () => {
		options.refreshBounds?.( view );
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
const usePromptView = (view:WebContentsView,options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	const side = options.promptSide || 'left';
	if(dev()){
		~async function loadDevPromptView() {
			const loaded = await safeLoadURL(
				view ,
				`${ createDevRendererURL( 'PromptView' ) }&side=${ side }` ,
				`Prompt-View-${ side }`,
			);
			if( !loaded ) {
				console.error( '[Views] Prompt-View dev server is unavailable. Run webpack.start before electron.start.' );
			}
		}();
	}else {
		void safeLoadFile(
			view ,
			path.join(absAppRunningPath,`./renderer/PromptView/index.html`) ,
			`Prompt-View-${ side }` ,
			{
				query : { side },
			},
		);
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
	context:string ,
	options?:LoadFileOptions,
) => {
	try {
		await view.webContents.loadFile( filePath , options );
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
		return {
			...options ,
			webPreferences : {
				nodeIntegration : false ,
				contextIsolation : true ,
				...( options.webPreferences || {} ),
			},
		};
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

type AI = "chatgpt"|"grok"|"gemini"|"deepseek"|"perplexity";
type ExtraBrowserWindowOptions = {
	domain? : string;
	type : "AI-View"|"Settings-View"|"Prompt-View";
	aiConfig?: AISettings.AIItem;
	settings?: Settings;
	promptSide?: PromptView.Side;
	refreshBounds?: (view:WebContentsView) => void;
}

import { mainWindow } from "#main/mainWindow";
import { ViewCrashReporter } from "#main/reaxels/Views/AI-Views/crash-reporter";
import { applyAIProxyToView } from "#main/services/settings/proxy-service";
import { handleAISwitchShortcutInput } from '#main/services/shortcuts/ai-switch';
import { installWebContentsKeyboardGuard } from '#main/services/shortcuts/window-keyboard';
import { useBeautifulDevtool } from '#generics/modify-electron/beautiful-devtool';
import { reaxel_ElectronENV } from "#generics/reaxels/runtime-paths";
import {
	applyAIPageAppearanceToView ,
	getAIPageBackgroundColor ,
} from '#main/services/appearance';
import type { Settings } from "#src/Types/SettingsTypes";
import type { AI as AISettings } from "#src/Types/SettingsTypes/AI";
import type { PromptView } from '#src/Types/PromptView';
import {dev} from 'electron-is';
import {
	shell ,
	WebContentsView,
	dialog,
	type LoadFileOptions,
	type WebContentsViewConstructorOptions,
} from 'electron';
import * as path from "path";
