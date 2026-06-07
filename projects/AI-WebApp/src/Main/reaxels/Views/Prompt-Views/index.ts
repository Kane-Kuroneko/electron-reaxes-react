const { absAppRunningPath } = reaxel_ElectronENV();

export const reaxel_PromptViews = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		left : createPromptSideState( 'left' ) ,
		right : createPromptSideState( 'right' ),
	} );
	
	let ipcRegistered = false;
	const animationTimers:Partial<Record<PromptView.Side , ReturnType<typeof setInterval>>> = {};
	
	const registerIpc = () => {
		if( ipcRegistered ) return;
		ipcRegistered = true;
		
		useIpcRpc( 'get-prompt-view-state' ).handle( async( _ , side ) => {
			return getPromptViewState( side );
		} );
		
		useIpcRpc( 'save-prompt-view-items' ).handle( async( _ , side , items ) => {
			return savePromptViewItems( side , items );
		} );
		
		useIpcRpc( 'copy-prompt-view-text' ).handle( async( _ , text ) => {
			try {
				clipboard.writeText( text || '' );
				return { success : true };
			} catch ( error ) {
				return {
					success : false ,
					error : error instanceof Error ? error.message : String( error ),
				};
			}
		} );
	};
	
	const initPromptView = (side:PromptView.Side) => {
		registerIpc();
		const sideState = getSideState( side );
		if( sideState.view && !sideState.view.webContents.isDestroyed() ) {
			return sideState.view;
		}
		
		const view = initWebContentsView( {
			type : 'Prompt-View' ,
			promptSide : side ,
			webPreferences : {
				nodeIntegration : false ,
				contextIsolation : true ,
				preload : path.join( absAppRunningPath , 'preload.js' ),
			},
		} );
		
		mutateSide( side , state => {
			state.view = view;
		} );
		syncBounds();
		return view;
	};
	
	const getLayoutInsets = () => {
		return {
			left : Math.round( store.left.width ) ,
			right : Math.round( store.right.width ),
		};
	};
	
	const syncBounds = (bounds = mainWindow.getContentBounds()) => {
		syncSideBounds( 'left' , bounds );
		syncSideBounds( 'right' , bounds );
	};
	
	const togglePromptView = (side:PromptView.Side) => {
		const sideState = getSideState( side );
		return setPromptViewVisible( side , !sideState.visible );
	};
	
	const showPromptView = (side:PromptView.Side) => {
		return setPromptViewVisible( side , true );
	};
	
	const hidePromptView = (side:PromptView.Side) => {
		return setPromptViewVisible( side , false );
	};
	
	const setPromptViewVisible = (side:PromptView.Side , visible:boolean) => {
		if( visible ) {
			initPromptView( side );
			// PromptView 面向 AI page 复用 prompt，展开时让中心区域回到当前 AI page。
			Reaxel_View.setState( { settingsViewOpened : false } );
		}
		const targetWidth = visible ? getPromptViewTargetWidth() : 0;
		animatePromptViewWidth( side , targetWidth , visible );
	};
	
	const syncSideBounds = (side:PromptView.Side , bounds:Rectangle) => {
		const sideState = getSideState( side );
		const view = sideState.view;
		if( !view || view.webContents.isDestroyed() ) {
			return;
		}
		const width = Math.max( 0 , Math.round( sideState.width ) );
		const visible = width > 0 || sideState.visible;
		view.setVisible( visible );
		view.setBounds( {
			x : side === 'left' ? 0 : Math.max( 0 , bounds.width - width ) ,
			y : 0 ,
			width ,
			height : bounds.height,
		} );
	};
	
	const animatePromptViewWidth = (
		side:PromptView.Side ,
		targetWidth:number ,
		finalVisible:boolean,
	) => {
		clearAnimationTimer( side );
		const startedAt = Date.now();
		const sideState = getSideState( side );
		const startWidth = sideState.width;
		const distance = targetWidth - startWidth;
		
		mutateSide( side , state => {
			state.visible = true;
			state.targetWidth = targetWidth;
		} );
		
		if( distance === 0 ) {
			finishAnimation( side , targetWidth , finalVisible );
			return;
		}
		
		animationTimers[side] = setInterval( () => {
			const elapsed = Date.now() - startedAt;
			const progress = Math.min( 1 , elapsed / PROMPT_VIEW_ANIMATION_MS );
			const eased = promptViewBezier( progress );
			const nextWidth = Math.round( startWidth + distance * eased );
			
			mutateSide( side , state => {
				state.width = nextWidth;
			} );
			Reaxel_View().fitWindow();
			
			if( progress >= 1 ) {
				finishAnimation( side , targetWidth , finalVisible );
			}
		} , 16 );
	};
	
	const finishAnimation = (
		side:PromptView.Side ,
		targetWidth:number ,
		finalVisible:boolean,
	) => {
		clearAnimationTimer( side );
		mutateSide( side , state => {
			state.width = targetWidth;
			state.targetWidth = targetWidth;
			state.visible = finalVisible;
		} );
		syncBounds();
		Reaxel_View().fitWindow();
		const sideState = getSideState( side );
		if( finalVisible ) {
			sideState.view?.webContents.focus();
		} else {
			sideState.view?.setVisible( false );
		}
	};
	
	const clearAnimationTimer = (side:PromptView.Side) => {
		const timer = animationTimers[side];
		if( timer ) {
			clearInterval( timer );
			delete animationTimers[side];
		}
	};
	
	const getSideState = (side:PromptView.Side) => {
		return side === 'right' ? store.right : store.left;
	};
	
	const mutateSide = (
		side:PromptView.Side ,
		updater:(state:PromptSideState) => void,
	) => {
		if( side === 'right' ) {
			mutate.right( updater );
			return;
		}
		mutate.left( updater );
	};
	
	const rtn = {
		registerIpc ,
		initPromptView ,
		getLayoutInsets ,
		syncBounds ,
		togglePromptView ,
		showPromptView ,
		hidePromptView,
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

function createPromptSideState(side:PromptView.Side):PromptSideState {
	return {
		name : side === 'left' ? 'PromptViewLeft' : 'PromptViewRight' ,
		side ,
		view : checkAs<WebContentsView>( null ) ,
		visible : false ,
		width : 0 ,
		targetWidth : 0,
	};
}

const getPromptViewTargetWidth = () => {
	const { width } = mainWindow.getContentBounds();
	return Math.max( 260 , Math.min( 380 , Math.floor( width * 0.24 ) ) );
};

// cubic-bezier(0.16, 1, 0.3, 1)；用二分反解 x，再取 y，避免主进程 setBounds 线性跳变。
const promptViewBezier = (progress:number) => {
	const x1 = 0.16;
	const y1 = 1;
	const x2 = 0.3;
	const y2 = 1;
	let low = 0;
	let high = 1;
	let t = progress;
	
	for( let i = 0 ; i < 8 ; i++ ) {
		t = ( low + high ) / 2;
		const x = cubicBezierAxis( t , x1 , x2 );
		if( x < progress ) {
			low = t;
		} else {
			high = t;
		}
	}
	
	return cubicBezierAxis( t , y1 , y2 );
};

const cubicBezierAxis = (t:number , p1:number , p2:number) => {
	const invT = 1 - t;
	return 3 * invT * invT * t * p1
		+ 3 * invT * t * t * p2
		+ t * t * t;
};

const PROMPT_VIEW_ANIMATION_MS = 260;

type PromptSideState = {
	name: 'PromptViewLeft' | 'PromptViewRight';
	side: PromptView.Side;
	view: WebContentsView;
	visible: boolean;
	width: number;
	targetWidth: number;
};

import { initWebContentsView } from '#main/reaxels/Views/utils/initWebContentsView';
import { Reaxel_View } from '#main/reaxels/Views';
import {
	getPromptViewState ,
	savePromptViewItems,
} from '#main/services/prompt-view';
import { useIpcRpc } from '#main/services/ipc';
import { mainWindow } from '#main/mainWindow';
import { reaxel_ElectronENV } from '#generics/reaxels/runtime-paths';
import type { PromptView } from '#src/Types/PromptView';
import {
	clipboard ,
	type Rectangle ,
	type WebContentsView,
} from 'electron';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import * as path from 'node:path';
