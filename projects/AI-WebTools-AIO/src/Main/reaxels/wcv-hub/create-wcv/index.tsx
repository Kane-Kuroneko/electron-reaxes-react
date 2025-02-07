let webcontentsviewID = 0;
export const createWebContentsView = async( options: Options ) : Promise<WebContentsViewController> => {
	return app.whenReady().then( () => {
		
		const wcv = new WebContentsView( {
			webPreferences : {
				experimentalFeatures : false ,
				devTools : true ,
				contextIsolation : true,
				preload : path.join(reaxel_ElectronENV().absAppRunningPath,'preload.js'),
				
			} ,
			
		} );
		if( options.proxyRules && _.isString( options.proxyRules ) ) {
			wcv.webContents.session.setProxy( {
				proxyRules : options.proxyRules ,
			} );
		}
		useBeautifulDevtool(wcv);
		// wcv.webContents.openDevTools( { mode : 'detach' } );
		wcv.webContents.loadURL( options.url );
		wcv.webContents.executeJavaScript( script_F12OpenDevtools );
		
		return {
			wcv , controller : {
				spore_id : ++webcontentsviewID,
			},
		};
	} );
};


ipcMain.handle( 'devtools' , ( event , {action} ) => {
	if(action === 'open'){
		
	}
	console.log(event,action);
} );

ipcMain.handle('fetch-webcontents-info',(event, args) => {
	return ''
})

export type Options = {
	//wcv要加载的页面
	url: string,
	//代理地址和端口,如果不填或null则直连, 例如'http=127.0.0.1:7897;https=127.0.0.1:7897'
	proxyRules: string | null,
	//允许此页面在哪些域名之间跳转,如果不配置则仅允许在url所在的域名
	allowedDomains? : string[],
}

import type {WebContentsViewController} from '../index.tsx';

/*@ts-expect-error */
import script_F12OpenDevtools from '#main/ExcutebleScripts/f12-open-devtools.raw.tsx';
import { reaxel_ElectronENV } from '#root-projects/Autohotkey-GUI/projects/War3/src/Main/reaxels/runtime-paths';
import path from 'node:path';
import { app , WebContentsView ,ipcMain} from 'electron';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
