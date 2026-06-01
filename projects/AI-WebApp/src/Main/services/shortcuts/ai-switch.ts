type AISwitchShortcutHandlers = {
	next?: () => void;
	previous?: () => void;
};

type AISwitchShortcutDirection = keyof AISwitchShortcutHandlers;

let handlers:AISwitchShortcutHandlers = {};
let globalShortcutsRegistered = false;

const globalShortcutAccelerators:Record<AISwitchShortcutDirection , string> = {
	previous : 'CommandOrControl+[' ,
	next : 'CommandOrControl+]',
};

const shortcutDirections:AISwitchShortcutDirection[] = [ 'previous' , 'next' ];

export const setAISwitchShortcutHandlers = (nextHandlers:AISwitchShortcutHandlers) => {
	handlers = nextHandlers;
};

export const registerAISwitchGlobalShortcuts = () => {
	if( globalShortcutsRegistered ) {
		return;
	}
	const failedAccelerators:string[] = [];
	shortcutDirections.forEach( direction => {
		const accelerator = globalShortcutAccelerators[direction];
		if( globalShortcut.isRegistered( accelerator ) ) {
			return;
		}
		const registered = globalShortcut.register( accelerator , () => {
			invokeAISwitchShortcut( direction );
		} );
		if( !registered ) {
			failedAccelerators.push( accelerator );
		}
	} );
	globalShortcutsRegistered = shortcutDirections.every( direction => {
		return globalShortcut.isRegistered( globalShortcutAccelerators[direction] );
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
	if( !input.control && !input.meta ) {
		return false;
	}
	const key = String( input.key || '' ).toLowerCase();
	const code = String( input.code || '' );
	const direction = key === '[' || code === 'BracketLeft'
		? 'previous'
		: key === ']' || code === 'BracketRight'
			? 'next'
			: null;
	if( !direction ) {
		return false;
	}
	event.preventDefault();
	invokeAISwitchShortcut( direction );
	return true;
};

const invokeAISwitchShortcut = (direction:AISwitchShortcutDirection) => {
	handlers[direction]?.();
};

app.on( 'will-quit' , unregisterAISwitchGlobalShortcuts );

import {
	app ,
	globalShortcut,
} from 'electron';
