
const { absAppRunningPath } = reaxel_ElectronENV();

export const initWebContentsView = (options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	
	const view = new WebContentsView(options);
	
	mainWindow.contentView.addChildView(view);
	
	if(options.type==='Settings-View'){
		useSettingsView(view, options);
	}else if(options.type==='AI-View'){
		useAIView(view, options);
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
		if (input.control && input.key.toLowerCase() === 'r') {
			if (input.shift) {
				// Ctrl+Shift+R 强制重置域名
				view.webContents.loadURL(options.domain || "https://chatgpt.com");
			} else {
				// Ctrl+R 重新加载当前页面
				view.webContents.reload();
			}
		}
		if(input.key.toLowerCase() === 'f12'){
			view.webContents.toggleDevTools();
		}
	});
	
	return view;
}

const useSettingsView = (view:WebContentsView,options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	view.webContents.loadFile(path.join(absAppRunningPath,`./renderer/SettingsView/index.html`))
}
const useAIView = (view:WebContentsView,options:WebContentsViewConstructorOptions&ExtraBrowserWindowOptions) => {
	view.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});
	view.webContents.loadURL( options.domain || "https://chatgpt.com" );
};

import {
	shell ,
	WebContentsView,
	WebContentsViewConstructorOptions,
} from 'electron';
import { mainWindow } from "#main/mainWindow";
import * as path from "path";
import { reaxel_ElectronENV } from "#generic/reaxels/runtime-paths";

type AI = "chatgpt"|"grok"|"gemini"|"deepseek";
type ExtraBrowserWindowOptions = {
	domain? : string;
	type : "AI-View"|"Settings-View";
}
