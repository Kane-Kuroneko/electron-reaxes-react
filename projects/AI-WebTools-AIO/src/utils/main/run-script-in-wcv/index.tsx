export const runScriptInWcv = (options:Options) => {
	
	app.whenReady().then(() => {
		const pageLoaded = new Promise( ( resolve ) => {
			if( options.wcv.webContents ) {
				resolve(null);
			} else {
				window.addEventListener( 'load' , resolve );
			}
		} );
		options.wcv.webContents.executeJavaScript(``)
		
		
		options.wcv.webContents.on('did-finish-load',() => {
			options.wcv.webContents.executeJavaScript( options.script );
		})
		
	})
}



export type Options = {
	wcv : WebContentsView,
	//要运行在wcv的js代码
	script : string,
	//运行代码的时机,todo
	timing : string
}

import {app} from 'electron';
import type {WebContentsView} from 'electron';
