export const useOpenDevtools = (window:BrowserWindow,options : Options) => {
	
	app.whenReady().then(() => {
		const {width,height} = window.getBounds();
		window.webContents.openDevTools( options.devtoolsOptions ?? { mode : "left"} );
		window.setBounds( { width : options.width + width } );
	});
}


export type Options = {
	width? : number;
	center? : "auto" | boolean ,
	devtoolsOptions? : OpenDevToolsOptions
}


import { app } from 'electron';
import type { BrowserWindow ,OpenDevToolsOptions } from 'electron';
