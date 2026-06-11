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
	const animationTimers:Partial<Record<PromptView.Side , ReturnType<typeof setTimeout>>> = {};
	
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

		useIpcRendererToMain( 'prompt-view-appearance-preview-change' ).on( ( _ , appearance ) => {
			broadcastPromptViewAppearanceState( getPromptViewAppearanceState( appearance ) );
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

	const syncAppearanceFromSettings = () => {
		broadcastPromptViewAppearanceState( getPromptViewAppearanceState() );
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
		setViewVisibleIfChanged( view , visible );
		setViewBoundsIfChanged( view , {
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
		const startedAt = performance.now();
		const sideState = getSideState( side );
		const startWidth = Math.round( sideState.width );
		const distance = targetWidth - startWidth;
		let lastSyncedWidth = startWidth;
		
		mutateSide( side , state => {
			state.visible = true;
			state.targetWidth = targetWidth;
		} );
		
		if( distance === 0 ) {
			finishAnimation( side , targetWidth , finalVisible );
			return;
		}
		
		const tick = () => {
			const elapsed = performance.now() - startedAt;
			const progress = Math.min( 1 , elapsed / PROMPT_VIEW_ANIMATION_MS );
			const eased = promptViewBezier( progress );
			const nextWidth = Math.round( startWidth + distance * eased );
			
			if( nextWidth !== lastSyncedWidth || progress >= 1 ) {
				lastSyncedWidth = nextWidth;
				mutateSide( side , state => {
					state.width = nextWidth;
				} );
				syncAnimatedLayout( side , nextWidth , distance > 0 );
			}

			if( progress >= 1 ) {
				finishAnimation( side , targetWidth , finalVisible );
				return;
			}

			animationTimers[side] = setTimeout( tick , PROMPT_VIEW_ANIMATION_FRAME_MS );
		};

		tick();
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
			Reaxel_View().focusCurrentContentView();
		}
	};
	
	const clearAnimationTimer = (side:PromptView.Side) => {
		const timer = animationTimers[side];
		if( timer ) {
			clearTimeout( timer );
			delete animationTimers[side];
		}
	};
	
	const syncAnimatedLayout = (
		side:PromptView.Side ,
		nextWidth:number ,
		expanding:boolean,
	) => {
		const bounds = mainWindow.getContentBounds();
		const leftWidth = side === 'left'
			? Math.max( 0 , nextWidth )
			: Math.max( 0 , Math.round( store.left.width ) );
		const rightWidth = side === 'right'
			? Math.max( 0 , nextWidth )
			: Math.max( 0 , Math.round( store.right.width ) );

		const syncCenterView = () => {
			Reaxel_View().fitCurrentCenterView( {
				x : leftWidth ,
				y : 0 ,
				width : Math.max( 1 , bounds.width - leftWidth - rightWidth ) ,
				height : bounds.height,
			} );
		};
		const syncSideViews = () => {
			syncSideBoundsWithWidth( 'left' , bounds , leftWidth );
			syncSideBoundsWithWidth( 'right' , bounds , rightWidth );
		};

		if( expanding ) {
			syncSideViews();
			syncCenterView();
			return;
		}
		syncCenterView();
		syncSideViews();
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
		syncAppearanceFromSettings,
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

const syncSideBoundsWithWidth = (
	side:PromptView.Side ,
	bounds:Rectangle ,
	width:number,
) => {
	const sideState = reaxel_PromptViews.store[side];
	const view = sideState.view;
	if( !view || view.webContents.isDestroyed() ) {
		return;
	}
	const roundedWidth = Math.max( 0 , Math.round( width ) );
	const visible = roundedWidth > 0 || sideState.visible;
	setViewVisibleIfChanged( view , visible );
	setViewBoundsIfChanged( view , {
		x : side === 'left' ? 0 : Math.max( 0 , bounds.width - roundedWidth ) ,
		y : 0 ,
		width : roundedWidth ,
		height : bounds.height,
	} );
};

const broadcastPromptViewAppearanceState = (state:PromptView.AppearanceState) => {
	const targets = [
		reaxel_PromptViews.store.left.view ,
		reaxel_PromptViews.store.right.view,
	]
		.filter( ( view ):view is WebContentsView => {
			return !!view && !view.webContents.isDestroyed();
		} )
		.map( view => view.webContents );

	if( targets.length === 0 ) {
		return;
	}
	useIpcMainToRenderer( 'prompt-view-appearance-change' ).targets( targets ).send( state );
};

const setViewVisibleIfChanged = (view:WebContentsView , visible:boolean) => {
	if( view.getVisible() === visible ) {
		return;
	}
	view.setVisible( visible );
};

const setViewBoundsIfChanged = (view:WebContentsView , bounds:Rectangle) => {
	if( isSameBounds( view.getBounds() , bounds ) ) {
		return;
	}
	view.setBounds( bounds );
};

const isSameBounds = (left:Rectangle , right:Rectangle) => {
	return left.x === right.x
		&& left.y === right.y
		&& left.width === right.width
		&& left.height === right.height;
};

const promptViewBezier = (progress:number) => {
	const x1 = 0.42;
	const y1 = 0;
	const x2 = 0.58;
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

const PROMPT_VIEW_ANIMATION_MS = 300;
const PROMPT_VIEW_ANIMATION_FRAME_MS = 3;

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
	getPromptViewAppearanceState ,
	savePromptViewItems,
} from '#main/services/prompt-view';
import {
	useIpcMainToRenderer ,
	useIpcRendererToMain ,
	useIpcRpc,
} from '#main/services/ipc';
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
