export const Reaxel_View = reaxel( () => {
	const electronStore = new ElectronStore<{
		previously_used_ai: string,
	}>( { name : "previously-used-ai" } );
	const previouslyUsedAI = electronStore.get( "previously_used_ai" ) || "";
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		currentAIViewKey : previouslyUsedAI ,
		settingsViewOpened : false,
	} );

	function fitWindow(target?:string) {
		const { width , height } = mainWindow.getContentBounds();
		const centerBounds = getCenterBounds( { x : 0 , y : 0 , width , height } );
		const viewSetBounds = (view:WebContentsView) => setViewBoundsIfChanged( view , centerBounds );

		if( target ) {
			const runtimeView = reaxel_AIViews.store.AIViews.find( item => item.id === target );
			viewSetBounds( runtimeView?.view );
			reaxel_PromptViews().syncBounds( { x : 0 , y : 0 , width , height } );
			return;
		}
		reaxel_AIViews.store.AIViews.forEach( runtimeView => {
			viewSetBounds( runtimeView.view );
		} );
		viewSetBounds( reaxel_SettingsView.store.settingsView.view );
		reaxel_PromptViews().syncBounds( { x : 0 , y : 0 , width , height } );
	}

	function fitContentView(view?:WebContentsView | null) {
		setViewBoundsIfChanged( view , getCenterBounds() );
	}

	function fitCurrentCenterView(bounds:Rectangle) {
		setViewBoundsIfChanged( getCurrentCenterView() , bounds );
	}

	function getCenterBounds(bounds = mainWindow.getContentBounds()):Rectangle {
		const promptInsets = reaxel_PromptViews().getLayoutInsets();
		const menuBarHeight = getMenuBarHeight();
		return {
			x : promptInsets.left ,
			y : menuBarHeight ,
			width : Math.max( 1 , bounds.width - promptInsets.left - promptInsets.right ) ,
			height : Math.max( 1 , bounds.height - menuBarHeight ),
		};
	}

	function setViewBoundsIfChanged(view:WebContentsView | null | undefined , bounds:Rectangle) {
		if( !view || view.webContents.isDestroyed() ) {
			return;
		}
		if( isSameBounds( view.getBounds() , bounds ) ) {
			return;
		}
		view.setBounds( bounds );
	}

	function focusCurrentContentView() {
		mainWindow.focus();
		const view = getCurrentCenterView();
		if( !view || view.webContents.isDestroyed() ) {
			return;
		}
		/* FocusMonitor: 通过 safeFocusViewWithMonitor 包装 focus() 调用 */
		try {
			safeFocusViewWithMonitor( view , 'focus-current-content-view' );
		} catch {
			view.webContents.focus();
		}
	}

	function getCurrentCenterView() {
		if( store.settingsViewOpened ) {
			return reaxel_SettingsView.store.settingsView.view;
		}
		return reaxel_AIViews().currentAIView?.view || null;
	}

	async function onReadyLoadAIView() {
		const settings = getRuntimeSettings();
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		const targetAI = resolveStartupAI( activeAIs , settings , store.currentAIViewKey );

		if( targetAI ) {
			setState( { currentAIViewKey : targetAI.id } );
			await reaxel_AIViews().syncAIViewsWithConfig( settings );
		}
	}

	const getWrappedIndex = (index:number , length:number) => {
		return ( index + length ) % length;
	};

	/* 构造 SwitchAiBar 显示载荷。
	   items 为全部活跃 AI（保持用户顺序），activeIndex 为当前 AI 的索引，
	   direction 告知组件滑动方向以保证"向前=卡片永远向左"的契约。
	   Swiper 以 items 为稳定 slide 列表，通过 slideNext/slidePrev 驱动方向正确的过渡。 */
	const createSwitchAiBarPayload = (
		items:SwitchAiBarPayloadItem[] ,
		activeIndex:number ,
		direction:FloatingView.SwitchAiBarDirection,
		ctxId?: string,
	):FloatingView.SwitchAiBarPayload => {
		return {
			items : items.map( ( { id , label , family } ) => ( { id , label , family } ) ) ,
			activeIndex ,
			direction,
			ctxId,
		};
	};

	const turnToAiPageByOffset = (
		offset:number ,
		direction:FloatingView.SwitchAiBarDirection,
	) => {
		if( shouldIgnoreDuplicateSwitch( direction ) ) {
			return null;
		}
		const settings = getRuntimeSettings();
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		if( activeAIs.length === 0 ) {
			reaxel_FloatingView().api.hideSwitchAiBar();
			return null;
		}

		const currentIndex = activeAIs.findIndex( ai => ai.id === store.currentAIViewKey );
		const baseIndex = currentIndex === -1
			? offset > 0 ? -1 : 0
			: currentIndex;
		const nextIndex = getWrappedIndex( baseIndex + offset , activeAIs.length );
		const nextAI = activeAIs[nextIndex];
		/* 性能记录 */
		const ctxId = perf.newCtx();
		perf.mark( 'switch:start' , 'main' , ctxId , {
			action : 'switch-configured' ,
			offset ,
			direction ,
			viewCount : activeAIs.length,
		} );

		const view = reaxel_AIViews().showAIView( nextAI.id , settings );

		reaxel_FloatingView().api.showSwitchAiBar(
			createSwitchAiBarPayload( activeAIs.map( createPayloadItemFromAI ) , nextIndex , direction , ctxId ),
		);

		perf.mark( 'switch:ipc-sent' , 'main' , ctxId , {
			action : 'switch-configured' ,
			activeIndex : nextIndex,
		} );

		return view;
	};

	const turnToInstantiatedAiPageByOffset = (
		offset:number ,
		direction:FloatingView.SwitchAiBarDirection,
	) => {
		if( shouldIgnoreDuplicateSwitch( `instantiated:${ direction }` ) ) {
			return null;
		}
		const settings = getRuntimeSettings();
		const runtimeViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		if( runtimeViews.length === 0 ) {
			reaxel_FloatingView().api.hideSwitchAiBar();
			return null;
		}

		const currentIndex = runtimeViews.findIndex( runtimeView => runtimeView.id === store.currentAIViewKey );
		const baseIndex = currentIndex === -1
			? offset > 0 ? -1 : 0
			: currentIndex;
		const nextIndex = getWrappedIndex( baseIndex + offset , runtimeViews.length );
		const nextRuntimeView = runtimeViews[nextIndex];

		/* 性能记录 */
		const ctxId = perf.newCtx();
		perf.mark( 'switch:start' , 'main' , ctxId , {
			action : 'switch-instantiated' ,
			direction ,
			viewCount : runtimeViews.length,
		} );

		setState( {
			currentAIViewKey : nextRuntimeView.id ,
			settingsViewOpened : false,
		} );
		reaxel_AIViews().applyVisibility();

		reaxel_FloatingView().api.showSwitchAiBar(
			createSwitchAiBarPayload( runtimeViews.map( createPayloadItemFromRuntimeView ) , nextIndex , direction , ctxId ),
		);

		perf.mark( 'switch:ipc-sent' , 'main' , ctxId , {
			action : 'switch-instantiated' ,
			activeIndex : nextIndex,
		} );

		return nextRuntimeView.view;
	};

	const turnToNextAiPage = () => {
		return turnToAiPageByOffset( 1 , 'next' );
	};

	const turnToPreviousAiPage = () => {
		return turnToAiPageByOffset( -1 , 'previous' );
	};

	const turnToNextInstantiatedAiPage = () => {
		return turnToInstantiatedAiPageByOffset( 1 , 'next' );
	};

	const turnToPreviousInstantiatedAiPage = () => {
		return turnToInstantiatedAiPageByOffset( -1 , 'previous' );
	};

	const closeCurrentAIView = () => {
		const settings = getRuntimeSettings();
		const runtimeViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
		const currentRuntimeView = runtimeViews.find( runtimeView => runtimeView.id === store.currentAIViewKey );

		if( !store.settingsViewOpened && currentRuntimeView && runtimeViews.length <= 1 ) {
			reaxel_FloatingView().api.showGlobalMessage( {
				type : 'warning' ,
				content : reaxel_I18n().i18n( 'The last AI page cannot be closed' ),
			} );
			return false;
		}

		/* 性能记录：关闭开始 */
		const ctxId = perf.newCtx();
		perf.mark( 'switch:start' , 'main' , ctxId , {
			action : 'close' ,
			currentId : currentRuntimeView?.id ,
			viewCount : runtimeViews.length,
		} );

		const result = reaxel_AIViews().closeCurrentAIViewAndShowNext( settings );

		if( result ) {
			/* 关闭成功后，向 FloatingView 发送更新后的卡片载荷。
			   Ctrl+W 销毁了当前 AI View，需同步刷新 SwitchAiBar 的 items 和 activeIndex。 */
			const updatedRuntimeViews = reaxel_AIViews().getRuntimeAIViewsInSettingsOrder( settings );
			const nextIndex = updatedRuntimeViews.findIndex(
				rv => rv.id === store.currentAIViewKey,
			);

			reaxel_FloatingView().api.showSwitchAiBar(
				createSwitchAiBarPayload(
					updatedRuntimeViews.map( createPayloadItemFromRuntimeView ) ,
					nextIndex >= 0 ? nextIndex : 0 ,
					'next',
					ctxId,
				),
			);

			perf.mark( 'switch:ipc-sent' , 'main' , ctxId , {
				action : 'close' ,
				itemCount : updatedRuntimeViews.length ,
				activeIndex : nextIndex,
			} );
		}

		return result;
	};

	let lastSwitchAt = 0;
	let lastSwitchDirection:string | null = null;

	const shouldIgnoreDuplicateSwitch = (direction:string) => {
		const now = Date.now();
		const duplicate = direction === lastSwitchDirection && now - lastSwitchAt < 40;
		lastSwitchAt = now;
		lastSwitchDirection = direction;
		return duplicate;
	};

	let runtimeViewsInitialized = false;

	const initRuntimeViews = async() => {
		if( runtimeViewsInitialized ) return;
		runtimeViewsInitialized = true;
		setAISwitchShortcutHandlers( {
			nextConfigured : () => {
				turnToNextAiPage();
			} ,
			previousConfigured : () => {
				turnToPreviousAiPage();
			} ,
			nextInstantiated : () => {
				turnToNextInstantiatedAiPage();
			} ,
			previousInstantiated : () => {
				turnToPreviousInstantiatedAiPage();
			} ,
			closeCurrent : () => {
				closeCurrentAIView();
			},
				nextInstantiatedTab : () => {
					turnToNextInstantiatedAiPage();
				} ,
				previousInstantiatedTab : () => {
					turnToPreviousInstantiatedAiPage();
				},
		} );
		registerAISwitchGlobalShortcuts();
		reaxel_FloatingView().initFloatingView();
		reaxel_PromptViews().registerIpc();
		await onReadyLoadAIView();
		mainWindow.on( 'resize' , () => {
			fitWindow();
		} );
		mainWindow.on( 'focus' , registerAISwitchGlobalShortcuts );
		mainWindow.on( 'show' , registerAISwitchGlobalShortcuts );
		mainWindow.on( 'restore' , registerAISwitchGlobalShortcuts );
		mainWindow.on( 'blur' , unregisterAISwitchGlobalShortcuts );
		mainWindow.on( 'hide' , unregisterAISwitchGlobalShortcuts );
		mainWindow.on( 'minimize' , unregisterAISwitchGlobalShortcuts );
		mainWindow.on( 'closed' , unregisterAISwitchGlobalShortcuts );

		useIpcRendererToMain( 'update-preload-ai-config' ).on( async() => {
			await reaxel_AIViews().syncAIViewsWithConfig( getRuntimeSettings() );
		} );

		useIpcRendererToMain( 'turn-to-next-ai-page' ).on( () => {
			void turnToNextAiPage();
		} );

		useIpcRendererToMain( 'turn-to-previous-ai-page' ).on( () => {
			void turnToPreviousAiPage();
		} );
	};

	obsReaction( ( first ) => {
		if( first ) return;
		if( store.currentAIViewKey ) {
			electronStore.set( "previously_used_ai" , store.currentAIViewKey );
		}
	} , () => [ store.currentAIViewKey ] );

	/* 切换 AI page / Settings 时仅更新当前中心视图的 bounds。
	   全量 fitWindow()（遍历所有 views）由 mainWindow resize 事件独立驱动，
	   切换操作无需为隐藏视图重复计算布局。 */
	obsReaction( ( first ) => {
		if( first ) return;

		fitCurrentCenterView( getCenterBounds() );
		reaxel_SettingsView.store.settingsView.view?.setVisible( store.settingsViewOpened );
		reaxel_AIViews().applyVisibility();
	} , () => [
		store.settingsViewOpened ,
		store.currentAIViewKey,
	] );

	const rtn = {
		initRuntimeViews ,
		fitWindow,
		fitContentView ,
		fitCurrentCenterView ,
		focusCurrentContentView ,
		turnToNextAiPage ,
		turnToPreviousAiPage ,
		turnToNextInstantiatedAiPage ,
		turnToPreviousInstantiatedAiPage ,
		closeCurrentAIView,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const getRuntimeSettings = ():Settings => {
	const settingsConfigService = getSettingsConfigService();
	const aiConfigService = getAIConfigService();
	return {
		...settingsConfigService.getEffectiveSettings() ,
		AIs : aiConfigService.getEffectiveAIs(),
	};
};

const createPayloadItemFromAI = (ai:AI.AIItem):SwitchAiBarPayloadItem => {
	return {
		id : ai.id ,
		label : ai.label ,
		family : ai.AI_family,
	};
};

const createPayloadItemFromRuntimeView = (runtimeView:RuntimeAIView):SwitchAiBarPayloadItem => {
	return {
		id : runtimeView.id ,
		label : runtimeView.label ,
		family : runtimeView.AIName,
	};
};

const isSameBounds = (left:Rectangle , right:Rectangle) => {
	return left.x === right.x
		&& left.y === right.y
		&& left.width === right.width
		&& left.height === right.height;
};

type SwitchAiBarPayloadItem = {
	id: string;
	label: string;
	family: AI.AIFamily;
};

const resolveStartupAI = (
	activeAIs:AI.AIItem[] ,
	settings:Settings ,
	currentAIViewKey:string,
) => {
	if( activeAIs.length === 0 ) {
		return null;
	}
	if( settings.startup.aiPageLoadMode === 'first-ai' ) {
		return activeAIs[0];
	}
	return activeAIs.find( ai => ai.id === currentAIViewKey )
		|| activeAIs.find( ai => ai.AI_family === currentAIViewKey )
		|| activeAIs[0];
};

/* ==========================================
   菜单栏高度常量
   ========================================== */
const MENU_BAR_HEIGHT = process.platform === 'darwin' ? 38 : 32;

const getMenuBarHeight = () => {
	return MENU_BAR_HEIGHT;
};

import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { reaxel_PromptViews } from '#main/reaxels/Views/Prompt-Views';
import {
	type Rectangle ,
	WebContentsView,
} from "electron";
import ElectronStore from "electron-store";
import { mainWindow } from "#main/mainWindow";
import { reaxel_AIViews } from "#main/reaxels/Views/AI-Views";
import { safeFocusViewWithMonitor } from "#main/reaxels/Views/AI-Views";
import {
	reaxel_FloatingView ,
} from "#main/reaxels/Views/FloatingView";
import { reaxel_I18n } from "#main/reaxels/I18n";
import { useIpcRendererToMain } from "#main/services/ipc";
import {
	registerAISwitchGlobalShortcuts ,
	setAISwitchShortcutHandlers ,
	unregisterAISwitchGlobalShortcuts,
} from '#main/services/shortcuts/ai-switch';
import { getAIConfigService } from "#main/services/settings/ai-config-service";
import { getSettingsConfigService } from "#main/services/settings/settings-config-service";
import type { FloatingView } from "#src/Types/FloatingView";
import type { AI } from "#src/Types/SettingsTypes/AI";
import type { Settings } from "#src/Types/SettingsTypes";
import type { RuntimeAIView } from "#main/reaxels/Views/AI-Views";
import { perf } from '#src/shared/utils/switch-perf-recorder.utility';
import {
	createReaxable ,
	obsReaction ,
	reaxel,
} from "reaxes";
