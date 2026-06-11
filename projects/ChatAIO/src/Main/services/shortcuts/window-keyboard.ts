const guardedWebContents = new WeakSet<WebContents>();

let browserWindowKeyboardGuardsRegistered = false;

export const registerBrowserWindowKeyboardGuards = () => {
	if( browserWindowKeyboardGuardsRegistered ) {
		return;
	}
	browserWindowKeyboardGuardsRegistered = true;
	BrowserWindow.getAllWindows().forEach( installBrowserWindowKeyboardGuard );
	app.on( 'browser-window-created' , ( _ , browserWindow ) => {
		installBrowserWindowKeyboardGuard( browserWindow );
	} );
};

export const installBrowserWindowKeyboardGuard = (browserWindow:BrowserWindow) => {
	if( !browserWindow || browserWindow.isDestroyed() ) {
		return;
	}
	installWebContentsKeyboardGuard( browserWindow.webContents );
};

export const installWebContentsKeyboardGuard = (webContents:WebContents) => {
	if( !webContents || webContents.isDestroyed() || guardedWebContents.has( webContents ) ) {
		return;
	}
	guardedWebContents.add( webContents );
	webContents.on( 'before-input-event' , handleWindowKeyboardInput );
	webContents.once( 'destroyed' , () => {
		guardedWebContents.delete( webContents );
	} );
};

export const handleWindowKeyboardInput = (event:any , input:any) => {
	return preventSingleAltMenuFocus( event , input );
};

const preventSingleAltMenuFocus = (event:any , input:any) => {
	if( !isSingleAltInput( input ) ) {
		return false;
	}
	event.preventDefault();
	return true;
};

const isSingleAltInput = (input:any) => {
	if( input.type !== 'keyDown' && input.type !== 'keyUp' ) {
		return false;
	}
	const key = String( input.key || '' ).toLowerCase();
	const code = String( input.code || '' );
	const isAltKey = key === 'alt' || code === 'AltLeft' || code === 'AltRight';
	return isAltKey && !input.control && !input.meta && !input.shift;
};

import {
	app ,
	BrowserWindow ,
	type WebContents,
} from 'electron';
