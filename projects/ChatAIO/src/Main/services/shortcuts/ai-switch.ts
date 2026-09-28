/**
 * AI 页切换 / 关闭当前页：只走 in-app `before-input-event`。
 * 禁止 `globalShortcut`：那会在其它应用前台时仍抢走 Ctrl+W / Ctrl+[ 等。
 * 设计：docs/issues/shortcuts-must-be-in-app.md
 */

type AISwitchShortcutHandlers = {
	nextConfigured?: () => void;
	previousConfigured?: () => void;
	nextInstantiated?: () => void;
	previousInstantiated?: () => void;
	closeCurrent?: () => void;
	nextInstantiatedTab?: () => void;
	previousInstantiatedTab?: () => void;
};

export type AISwitchShortcutAction = keyof AISwitchShortcutHandlers;

let handlers:AISwitchShortcutHandlers = {};

export const setAISwitchShortcutHandlers = (nextHandlers:AISwitchShortcutHandlers) => {
	handlers = nextHandlers;
};

export const handleAISwitchShortcutInput = (event:any , input:any) => {
	if( input.type !== 'keyDown' ) {
		return false;
	}
	const key = String( input.key || '' ).toLowerCase();
	const code = String( input.code || '' );
	const action = resolveAISwitchShortcutAction( input , key , code );
	if( !action ) {
		return false;
	}
	event.preventDefault();
	invokeAISwitchShortcut( action );
	return true;
};

export const resolveAISwitchShortcutAction = (
	input:{
		control?:boolean;
		meta?:boolean;
		alt?:boolean;
		shift?:boolean;
	} ,
	key:string ,
	code:string,
):AISwitchShortcutAction | null => {
	if( ( input.control || input.meta ) && !input.alt && ( key === 'tab' || code === 'Tab' ) ) {
		return input.shift ? 'previousInstantiatedTab' : 'nextInstantiatedTab';
	}

	const bracketDirection = key === '[' || code === 'BracketLeft'
		? 'previous'
		: key === ']' || code === 'BracketRight'
			? 'next'
			: null;
	if( bracketDirection && ( input.control || input.meta ) ) {
		return bracketDirection === 'previous' ? 'previousInstantiated' : 'nextInstantiated';
	}
	if( bracketDirection && input.alt && !input.control && !input.meta ) {
		return bracketDirection === 'previous' ? 'previousConfigured' : 'nextConfigured';
	}
	if( ( input.control || input.meta ) && !input.alt && ( key === 'w' || code === 'KeyW' ) ) {
		return 'closeCurrent';
	}
	return null;
};

const invokeAISwitchShortcut = (action:AISwitchShortcutAction) => {
	handlers[action]?.();
};
