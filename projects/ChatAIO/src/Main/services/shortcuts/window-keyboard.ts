const guardedWebContents = new WeakSet<WebContents>();

let browserWindowKeyboardGuardsRegistered = false;
let menuShortcutHandlers:MenuShortcutHandlers = {};

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
	if( preventSingleAltMenuFocus( event , input ) ) {
		return true;
	}
	return handleMenuShortcutInput( event , input );
};

export const setMenuShortcutHandlers = (handlers:MenuShortcutHandlers) => {
	menuShortcutHandlers = handlers;
};

const handleMenuShortcutInput = (event:any , input:any) => {
	if( input.type !== 'keyDown' ) {
		return false;
	}
	const action = resolveMenuShortcutAction( input );
	if( !action ) {
		return false;
	}
	event.preventDefault();
	menuShortcutHandlers[action]?.();
	return true;
};

const resolveMenuShortcutAction = (input:any):keyof MenuShortcutHandlers | null => {
	const key = String( input.key || '' ).toLowerCase();
	const code = String( input.code || '' );
	const commandOrControl = input.control || input.meta;

	if( !input.alt && !input.control && !input.meta && !input.shift && ( key === 'f12' || code === 'F12' ) ) {
		return 'toggleDevTools';
	}
	if( commandOrControl && !input.alt && ( key === 'r' || code === 'KeyR' ) ) {
		return input.shift ? 'forceReload' : 'reload';
	}
	if( commandOrControl && !input.alt && ( key === '=' || key === '+' || code === 'Equal' || code === 'NumpadAdd' ) ) {
		return 'zoomIn';
	}
	if( commandOrControl && !input.alt && ( key === '-' || code === 'Minus' || code === 'NumpadSubtract' ) ) {
		return 'zoomOut';
	}
	if( commandOrControl && !input.alt && ( key === '0' || code === 'Digit0' || code === 'Numpad0' ) ) {
		return 'actualSize';
	}
	if( input.alt && !input.control && !input.meta && ( key === ',' || code === 'Comma' ) ) {
		return 'togglePromptLeft';
	}
	if( input.alt && !input.control && !input.meta && ( key === '.' || code === 'Period' ) ) {
		return 'togglePromptRight';
	}
	return null;
};

// 防止单独按下 Alt 键时聚焦菜单栏（仅在 Windows 上有实际作用）。
// Windows 上 Alt 键会触发菜单栏焦点，干扰 Alt+, / Alt+. 等快捷键。
// macOS 使用 Cmd 触发菜单栏，此守卫无操作效果；Linux 行为因桌面环境而异。
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

type MenuShortcutHandlers = {
	reload?: () => void;
	forceReload?: () => void;
	toggleDevTools?: () => void;
	togglePromptLeft?: () => void;
	togglePromptRight?: () => void;
	actualSize?: () => void;
	zoomIn?: () => void;
	zoomOut?: () => void;
};
