type AISwitchShortcutHandlers = {
	nextConfigured?: () => void;
	previousConfigured?: () => void;
	nextInstantiated?: () => void;
	previousInstantiated?: () => void;
	closeCurrent?: () => void;
};

type AISwitchShortcutAction = keyof AISwitchShortcutHandlers;

let handlers:AISwitchShortcutHandlers = {};
let globalShortcutsRegistered = false;

const globalShortcutAccelerators:Record<AISwitchShortcutAction , string> = {
	previousConfigured : 'CommandOrControl+[' ,
	nextConfigured : 'CommandOrControl+]' ,
	previousInstantiated : 'Alt+[' ,
	nextInstantiated : 'Alt+]' ,
	closeCurrent : 'CommandOrControl+W',
};

const shortcutActions:AISwitchShortcutAction[] = [
	'previousConfigured' ,
	'nextConfigured' ,
	'previousInstantiated' ,
	'nextInstantiated' ,
	'closeCurrent',
];

export const setAISwitchShortcutHandlers = (nextHandlers:AISwitchShortcutHandlers) => {
	handlers = nextHandlers;
};

export const registerAISwitchGlobalShortcuts = () => {
	if( globalShortcutsRegistered ) {
		return;
	}
	const failedAccelerators:string[] = [];
	shortcutActions.forEach( action => {
		const accelerator = globalShortcutAccelerators[action];
		if( globalShortcut.isRegistered( accelerator ) ) {
			return;
		}
		const registered = globalShortcut.register( accelerator , () => {
			invokeAISwitchShortcut( action );
		} );
		if( !registered ) {
			failedAccelerators.push( accelerator );
		}
	} );
	globalShortcutsRegistered = shortcutActions.every( action => {
		return globalShortcut.isRegistered( globalShortcutAccelerators[action] );
	} );
	if( failedAccelerators.length ) {
		console.warn( '[Shortcuts] Failed to register AI switch shortcuts:' , failedAccelerators );
	}
};

export const unregisterAISwitchGlobalShortcuts = () => {
	Object.values( globalShortcutAccelerators ).forEach( accelerator => {
		if( globalShortcut.isRegistered( accelerator ) ) {
			globalShortcut.unregister( accelerator );
		}
	} );
	globalShortcutsRegistered = false;
};

export const handleAISwitchShortcutInput = (event:any , input:any) => {
	if( input.type !== 'keyDown' ) {
		return false;
	}
	const key = String( input.key || '' ).toLowerCase();
	const code = String( input.code || '' );
	const action = resolveShortcutAction( input , key , code );
	if( !action ) {
		return false;
	}
	event.preventDefault();
	invokeAISwitchShortcut( action );
	return true;
};

const resolveShortcutAction = (
	input:any ,
	key:string ,
	code:string,
):AISwitchShortcutAction | null => {
	const bracketDirection = key === '[' || code === 'BracketLeft'
		? 'previous'
		: key === ']' || code === 'BracketRight'
			? 'next'
			: null;
	if( bracketDirection && ( input.control || input.meta ) ) {
		return bracketDirection === 'previous' ? 'previousConfigured' : 'nextConfigured';
	}
	if( bracketDirection && input.alt && !input.control && !input.meta ) {
		return bracketDirection === 'previous' ? 'previousInstantiated' : 'nextInstantiated';
	}
	if( ( input.control || input.meta ) && !input.alt && ( key === 'w' || code === 'KeyW' ) ) {
		return 'closeCurrent';
	}
	return null;
};

const invokeAISwitchShortcut = (action:AISwitchShortcutAction) => {
	handlers[action]?.();
};

app.on( 'will-quit' , unregisterAISwitchGlobalShortcuts );

import {
	app ,
	globalShortcut,
} from 'electron';
