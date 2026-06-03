const { absAppRunningPath } = reaxel_ElectronENV();

export const reaxel_FloatingLayer = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		floatingLayer : {
			window : checkAs<BrowserWindow>( null ) ,
			loaded : false ,
			commandQueue : checkAs<FloatingLayer.Command[]>( [] ),
		},
	} );

	let mainWindowEventsBound = false;

	const getFloatingLayerBounds = () => {
		return mainWindow.getContentBounds();
	};

	const syncBounds = () => {
		const floatingWindow = store.floatingLayer.window;
		if( !floatingWindow || floatingWindow.isDestroyed() || mainWindow.isDestroyed() ) {
			return;
		}
		floatingWindow.setBounds( getFloatingLayerBounds() , false );
	};

	const showLayerWindow = () => {
		const floatingWindow = store.floatingLayer.window;
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		syncBounds();
		if( mainWindow.isVisible() && !mainWindow.isMinimized() ) {
			floatingWindow.showInactive();
			floatingWindow.moveTop();
		}
	};

	const hideLayerWindow = () => {
		const floatingWindow = store.floatingLayer.window;
		if( floatingWindow && !floatingWindow.isDestroyed() ) {
			floatingWindow.hide();
		}
	};

	const sendCommandNow = (command:FloatingLayer.Command) => {
		const floatingWindow = store.floatingLayer.window;
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		useIpcMainToRenderer( 'floating-layer-command' ).targets( [ floatingWindow.webContents ] ).send( command );
	};

	const flushCommandQueue = () => {
		if( !store.floatingLayer.loaded ) {
			return;
		}
		const commands = store.floatingLayer.commandQueue.slice();
		mutate.floatingLayer( state => {
			state.commandQueue = [];
		} );
		commands.forEach( sendCommandNow );
	};

	const queueOrSendCommand = (command:FloatingLayer.Command) => {
		const floatingWindow = initFloatingLayer();
		if( !floatingWindow || floatingWindow.isDestroyed() ) {
			return;
		}
		showLayerWindow();
		if( store.floatingLayer.loaded ) {
			sendCommandNow( command );
			return;
		}
		mutate.floatingLayer( state => {
			state.commandQueue.push( command );
		} );
	};

	const bindMainWindowEvents = () => {
		if( mainWindowEventsBound ) {
			return;
		}
		mainWindowEventsBound = true;

		mainWindow.on( 'move' , syncBounds );
		mainWindow.on( 'resize' , syncBounds );
		mainWindow.on( 'maximize' , syncBounds );
		mainWindow.on( 'unmaximize' , syncBounds );
		mainWindow.on( 'restore' , showLayerWindow );
		mainWindow.on( 'show' , showLayerWindow );
		mainWindow.on( 'focus' , showLayerWindow );
		mainWindow.on( 'blur' , hideLayerWindow );
		mainWindow.on( 'hide' , hideLayerWindow );
		mainWindow.on( 'minimize' , hideLayerWindow );
		mainWindow.on( 'closed' , () => {
			const floatingWindow = store.floatingLayer.window;
			if( floatingWindow && !floatingWindow.isDestroyed() ) {
				floatingWindow.close();
			}
		} );
	};

	function initFloatingLayer() {
		const existingWindow = store.floatingLayer.window;
		if( existingWindow && !existingWindow.isDestroyed() ) {
			return existingWindow;
		}

		const floatingWindow = new BrowserWindow( {
			parent : mainWindow ,
			show : false ,
			frame : false ,
			transparent : true ,
			backgroundColor : '#00000000' ,
			hasShadow : false ,
			resizable : false ,
			movable : false ,
			minimizable : false ,
			maximizable : false ,
			fullscreenable : false ,
			skipTaskbar : true ,
			focusable : false ,
			acceptFirstMouse : false ,
			alwaysOnTop : true ,
			webPreferences : {
				nodeIntegration : false ,
				contextIsolation : true ,
				backgroundThrottling : false ,
				preload : path.join( absAppRunningPath , 'preload.js' ),
			},
		} );

		floatingWindow.setIgnoreMouseEvents( true , { forward : true } );
		floatingWindow.setMenu( null );
		floatingWindow.setAlwaysOnTop( true , 'floating' );
		setState.floatingLayer( {
			window : floatingWindow ,
			loaded : false ,
			commandQueue : [],
		} );
		bindMainWindowEvents();
		syncBounds();

		floatingWindow.on( 'closed' , () => {
			setState.floatingLayer( {
				window : null ,
				loaded : false ,
				commandQueue : [],
			} );
		} );

		floatingWindow.webContents.once( 'did-finish-load' , () => {
			setState.floatingLayer( {
				loaded : true,
			} );
			syncBounds();
			showLayerWindow();
			flushCommandQueue();
		} );

		if( dev() ) {
			floatingWindow.webContents.loadURL( createDevRendererURL( 'Floating-Layer' ) , getFreshLoadURLOptions() );
		} else {
			floatingWindow.webContents.loadFile( path.join( absAppRunningPath , './renderer/Floating-Layer/index.html' ) );
		}

		return floatingWindow;
	}

	const api = {
		showSwitchAiBar( payload:FloatingLayer.SwitchAiBarPayload ) {
			queueOrSendCommand( {
				type : 'switch-ai-bar:show' ,
				payload,
			} );
		} ,
		hideSwitchAiBar() {
			queueOrSendCommand( {
				type : 'switch-ai-bar:hide',
			} );
		},
	};

	const rtn = {
		api ,
		initFloatingLayer ,
		syncBounds,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const createDevRendererURL = (entry:string) => {
	return `https://localhost:${ __DEV_PORT__ }/${ entry }?t=${ Date.now() }`;
};

const getFreshLoadURLOptions = () => {
	return {
		extraHeaders : [
			'Cache-Control: no-cache',
			'Pragma: no-cache',
		].join( '\n' ),
	};
};

import { mainWindow } from '#main/mainWindow';
import { useIpcMainToRenderer } from '#main/services/ipc';
import { reaxel_ElectronENV } from '#generics/reaxels/runtime-paths';
import type { FloatingLayer } from '#src/Types/FloatingLayer';
import {
	BrowserWindow,
} from 'electron';
import { dev } from 'electron-is';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import * as path from 'node:path';
