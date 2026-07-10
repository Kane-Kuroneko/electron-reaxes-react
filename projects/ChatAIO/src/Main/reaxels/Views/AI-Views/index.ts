export const reaxel_AIViews = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		AIViews : checkAs<RuntimeAIView[]>( [] ),
	} );

	useIpcSync( 'get-ai-page-environment' ).handle( ( { event } ) => {
		return getAIPageEnvironmentForWebContents( event.sender );
	} );

	const initAIView = ( ai:AI.AIItem , settings:Settings ) => {
		console.log( '[AIViews] initAIView start:' , ai.id , ai.url || getAIDomainByFamily( ai.AI_family ) );
		const existingRuntimeView = store.AIViews.find( item => item.id === ai.id );
		if( existingRuntimeView?.view ) {
			void updateRuntimeAIView( existingRuntimeView , ai , settings );
			Reaxel_View().fitWindow( ai.id );
			return existingRuntimeView.view;
		}

		const nextRuntimeView = createRuntimeAIView( ai , settings );

		mutate( s => {
			s.AIViews.push( nextRuntimeView );
		} );
		Reaxel_View().fitWindow( ai.id );

		return nextRuntimeView.view;
	};

	const destroyAIView = (id:string) => {
		const runtimeView = store.AIViews.find( item => item.id === id );
		if( !runtimeView?.view ) {
			return;
		}
		closeRuntimeWebContentsView( runtimeView.view , id , 'destroy' );
		mutate( s => {
			s.AIViews = s.AIViews.filter( item => item.id !== id );
		} );
	};

	/**
	 * 销毁所有AI Views并清除其session/storage数据
	 * 用于 Reset All AI Pages
	 */
	const destroyAllAndClearData = async(aiIds:string[] = []) => {
		const viewsCopy = store.AIViews.slice();

		// reset 需要覆盖未在本次运行期创建 view、但磁盘上已存在的历史 AI partition。
		const collectResult = collectResetPartitions( aiIds , viewsCopy );
		if( !collectResult.success ) {
			return collectResult;
		}

		// 销毁所有view
		viewsCopy.forEach( rv => {
			closeRuntimeWebContentsView( rv.view , rv.id , 'reset' );
		} );

		mutate( s => {
			s.AIViews = [];
		} );

		return await clearSessionPartitions( collectResult.partitions );
	};

	const syncAIViewsWithConfig = async( settings:Settings ) => {
		console.log( '[AIViews] syncAIViewsWithConfig start. AI count:' , settings.AIs.length );
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		const activeIds = new Set( activeAIs.map( ai => ai.id ) );

		store.AIViews.slice().forEach( runtimeView => {
			if( !activeIds.has( runtimeView.id ) ) {
				destroyAIView( runtimeView.id );
			}
		} );

		const currentAI = resolveCurrentAI( settings );
		if( currentAI && Reaxel_View.store.currentAIViewKey !== currentAI.id ) {
			Reaxel_View.setState( { currentAIViewKey : currentAI.id } );
		}

		for( const ai of activeAIs ) {
			const runtimeView = store.AIViews.find( item => item.id === ai.id );
			if( runtimeView ) {
				await updateRuntimeAIView( runtimeView , ai , settings );
				continue;
			}
			if( ai.preloadOnStartup || ai.id === Reaxel_View.store.currentAIViewKey ) {
				try {
					const isPreload = ai.preloadOnStartup && ai.id !== Reaxel_View.store.currentAIViewKey;
					console.log( `[AIViews] ${ isPreload ? 'Preloading' : 'Showing' } AI view: ${ ai.id } (${ ai.label })` );
					const view = initAIView( ai , settings );
					if( view ) {
						console.log( `[AIViews] AI view init done: ${ ai.id }` );
					}
				} catch ( error ) {
					console.error( `[AIViews] Failed to init AI view: ${ ai.id } (${ ai.label })` , error );
				}
			}
		}

		applyVisibility();
	};

	const showAIView = ( aiId:string , settings:Settings ) => {
		const ai = settings.AIs.find( item => item.id === aiId && !item.disabled );
		if( !ai ) {
			return null;
		}
		Reaxel_View.setState( {
			currentAIViewKey : ai.id ,
			settingsViewOpened : false,
		} );
		const view = initAIView( ai , settings );
		applyVisibility();
		return view;
	};

	const getRuntimeAIViewsInSettingsOrder = (settings:Settings) => {
		const runtimeViewById = new Map( store.AIViews.map( runtimeView => [
			runtimeView.id ,
			runtimeView,
		] ) );
		const orderedRuntimeViews = settings.AIs
			.filter( ai => !ai.disabled )
			.map( ai => runtimeViewById.get( ai.id ) )
			.filter( ( runtimeView ): runtimeView is RuntimeAIView => !!runtimeView );
		const orderedIds = new Set( orderedRuntimeViews.map( runtimeView => runtimeView.id ) );
		return [
			...orderedRuntimeViews ,
			...store.AIViews.filter( runtimeView => !orderedIds.has( runtimeView.id ) ),
		];
	};

	const canCloseCurrentAIView = (settings:Settings) => {
		if( Reaxel_View.store.settingsViewOpened ) {
			return false;
		}
		const runtimeViews = getRuntimeAIViewsInSettingsOrder( settings );
		const currentIndex = runtimeViews.findIndex( runtimeView => {
			return runtimeView.id === Reaxel_View.store.currentAIViewKey;
		} );
		return runtimeViews.length >= 1 && currentIndex !== -1;
	};

	const closeCurrentAIViewAndShowNext = (settings:Settings) => {
		if( !canCloseCurrentAIView( settings ) ) {
			return false;
		}
		const runtimeViews = getRuntimeAIViewsInSettingsOrder( settings );
		const currentIndex = runtimeViews.findIndex( runtimeView => {
			return runtimeView.id === Reaxel_View.store.currentAIViewKey;
		} );
		const currentRuntimeView = runtimeViews[currentIndex];

		destroyAIView( currentRuntimeView.id );
		if( runtimeViews.length > 1 ) {
			const nextRuntimeView = runtimeViews[( currentIndex + 1 ) % runtimeViews.length];
			Reaxel_View.setState( {
				currentAIViewKey : nextRuntimeView.id ,
				settingsViewOpened : false,
			} );
		} else {
			Reaxel_View.setState( {
				currentAIViewKey : '' ,
				settingsViewOpened : false,
			} );
		}
		applyVisibility();
		return true;
	};

	/* 上一次已应用的可见性状态，用于跳过 obsReaction 引发的冗余 applyVisibility() 调用。
	   showAIView / turnToInstantiatedAiPageByOffset 已同步调用 applyVisibility()，
	   obsReaction 在 microtask 中二次触发时状态未变，早期退出避免遍历全部 views。

	   必须同时追踪 currentAIViewKey、settingsOpened 和 AIViews 数量：
	   仅凭 key 判断会遗漏 syncAIViewsWithConfig 预加载新 view 但未切换 key 的场景——
	   新 WebContentsView 默认可见，若早期退出则不会隐藏它，导致多个 view 同时显示。 */
	let lastAppliedVisibilityKey: string | null = null;
	let lastAppliedSettingsOpened: boolean | null = null;
	let lastAppliedViewCount: number = -1;

	const applyVisibility = () => {
		const currentAIViewKey = Reaxel_View.store.currentAIViewKey;
		const settingsOpened = Reaxel_View.store.settingsViewOpened;
		const viewCount = store.AIViews.length;

		/* 早期退出：当前 key、settings 状态、view 数量均与上次一致 → 跳过 */
		if(
			currentAIViewKey === lastAppliedVisibilityKey
			&& settingsOpened === lastAppliedSettingsOpened
			&& viewCount === lastAppliedViewCount
		) {
			return;
		}
		lastAppliedVisibilityKey = currentAIViewKey;
		lastAppliedSettingsOpened = settingsOpened;
		lastAppliedViewCount = viewCount;

		store.AIViews.forEach( runtimeView => {
			if( !runtimeView.view ) {
				return;
			}
			const visible = !settingsOpened && runtimeView.id === currentAIViewKey;
			if( visible ) {
				/* 显式置顶：addChildView 对已添加的 view 幂等——先移除再追加到 contentView 末尾（顶层）。
				   与 openSettingsView() 中对 settingsView 的处理方式一致。 */
				mainWindow.contentView.addChildView( runtimeView.view );
			}
			runtimeView.view.setVisible( visible );
			if( visible ) {
				focusRuntimeAIViewIfReady( runtimeView );
			}
		} );
	};

	const rtn = {
		get currentAIView() {
			return store.AIViews.find( item => item.id === Reaxel_View.store.currentAIViewKey ) || null;
		} ,
		initAIView ,
		destroyAIView ,
		destroyAllAndClearData ,
		syncAIViewsWithConfig ,
		showAIView ,
		getRuntimeAIViewsInSettingsOrder ,
		canCloseCurrentAIView ,
		closeCurrentAIViewAndShowNext ,
		applyVisibility,
	};

	const createRuntimeAIView = (
		ai:AI.AIItem ,
		settings:Settings ,
		options:CreateRuntimeAIViewOptions = {},
	):RuntimeAIView => {
		const domain = ai.url || getAIDomainByFamily( ai.AI_family );
		const partition = getAIPartition( ai.id );
		const environment = getRuntimeAIPageEnvironment( settings );
		const view = initWebContentsView( {
			type : 'AI-View' ,
			domain : options.loadURL || domain ,
			aiConfig : ai ,
			settings ,
			refreshBounds : view => {
				Reaxel_View().fitContentView( view );
			} ,
			webPreferences : {
				partition,
			},
		} );
		setAIPageEnvironmentForView( view , environment );
		if( typeof options.visible === 'boolean' ) {
			view.setVisible( options.visible );
		}
		/* FocusMonitor: 注册新创建的 AI view 到监控器 */
		instrumentViewWithMonitor( view , ai.id );
		bindRuntimeAIViewReadyHandlers( ai.id , view );
		return {
			id : ai.id ,
			label : ai.label ,
			AIName : ai.AI_family ,
			view ,
			domain ,
			partition ,
			config : ai ,
			proxyKey : getRuntimeAIProxyKey( ai , settings ) ,
			appearanceKey : getAIPageAppearanceKey( environment ) ,
			ready : false,
		};
	};

	const bindRuntimeAIViewReadyHandlers = (aiId:string , view:WebContentsView) => {
		const markViewReady = () => {
			mutate( s => {
				const target = s.AIViews.find( item => item.id === aiId );
				if( target?.view === view ) {
					target.ready = true;
				}
			} );
			focusAIViewIfCurrent( aiId , view );
		};
		view.webContents.on( 'did-stop-loading' , markViewReady );
		view.webContents.on( 'did-fail-load' , markViewReady );
	};

	const updateRuntimeAIView = async(
		runtimeView:RuntimeAIView ,
		ai:AI.AIItem ,
		settings:Settings,
	) => {
		const nextDomain = ai.url || getAIDomainByFamily( ai.AI_family );
		const nextProxyKey = getRuntimeAIProxyKey( ai , settings );
		const nextEnvironment = getRuntimeAIPageEnvironment( settings );
		const nextAppearanceKey = getAIPageAppearanceKey( nextEnvironment );
		const domainChanged = runtimeView.domain !== nextDomain;
		const proxyChanged = runtimeView.proxyKey !== '' && runtimeView.proxyKey !== nextProxyKey;
		const appearanceChanged = runtimeView.appearanceKey !== '' && runtimeView.appearanceKey !== nextAppearanceKey;

		const resolvedProxy = await applyAIProxyToView( runtimeView.view , ai , settings );
		const appliedProxyKey = JSON.stringify( resolvedProxy );
		applyAIPageEnvironmentToView( runtimeView.view , nextEnvironment );
		applyBrowserIdentityToView( runtimeView.view , nextDomain , nextEnvironment.acceptLanguages );
		const appliedAppearanceKey = getAIPageAppearanceKey( nextEnvironment );
		applyRuntimeAIViewConfig( runtimeView , ai , nextDomain , appliedProxyKey , appliedAppearanceKey );
		setAIPageEnvironmentForView( runtimeView.view , nextEnvironment );

		if( appearanceChanged ) {
			sendAIPageEnvironmentToView( runtimeView.view , nextEnvironment , runtimeView.id );
		}

		if( domainChanged ) {
			runtimeView.ready = false;
			void safeLoadAIURL( runtimeView.view , nextDomain , `domainChanged:${ runtimeView.id }` );
		} else if( proxyChanged ) {
			runtimeView.ready = false;
			runtimeView.view.webContents.reloadIgnoringCache();
		}
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

const aiPageEnvironmentByWebContents = new WeakMap<WebContents , AIPageEnvironment>();

const safeLoadAIURL = async(
	view:WebContentsView ,
	url:string ,
	context:string,
) => {
	try {
		await view.webContents.loadURL( url );
	} catch ( error ) {
		console.warn( '[AIViews] loadURL failed:' , context , url , error );
	}
};

const applyRuntimeAIViewConfig = (
	runtimeView:RuntimeAIView ,
	ai:AI.AIItem ,
	domain:string ,
	proxyKey:string ,
	appearanceKey:string,
) => {
	runtimeView.label = ai.label;
	runtimeView.AIName = ai.AI_family;
	runtimeView.domain = domain;
	runtimeView.config = ai;
	runtimeView.proxyKey = proxyKey;
	runtimeView.appearanceKey = appearanceKey;
};

const resolveCurrentAI = (settings:Settings):AI.AIItem | null => {
	const activeAIs = settings.AIs.filter( ai => !ai.disabled );
	if( activeAIs.length === 0 ) {
		return null;
	}
	const currentKey = Reaxel_View.store.currentAIViewKey;
	return activeAIs.find( ai => ai.id === currentKey )
		|| activeAIs.find( ai => ai.AI_family === currentKey )
		|| activeAIs[0];
};

const PERSISTENT_PARTITION_PREFIX = 'persist:';
const AI_PARTITION_PREFIX = 'chataio-ai-';

export const getAIPartition = (aiId:string) => {
	return `${ PERSISTENT_PARTITION_PREFIX }${ AI_PARTITION_PREFIX }${ aiId.replace( /[^a-zA-Z0-9_-]/g , '_' ) }`;
};

const getAIPartitionsForAIIds = (aiIds:string[]) => {
	return aiIds
		.filter( Boolean )
		.map( getAIPartition );
};

const collectResetPartitions = (
	aiIds:string[] ,
	runtimeViews:RuntimeAIView[],
) => {
	const persistedPartitions = getPersistedAIPartitionsFromUserData();
	return {
		success : persistedPartitions.errors.length === 0 ,
		partitions : uniqueStrings( [
			...getAIPartitionsForAIIds( aiIds ) ,
			...runtimeViews.map( runtimeView => runtimeView.partition ) ,
			...persistedPartitions.partitions,
		] ) ,
		errors : persistedPartitions.errors,
	};
};

const getPersistedAIPartitionsFromUserData = ():PersistedAIPartitionDiscoveryResult => {
	try {
		const partitionsDir = path.join( app.getPath( 'userData' ) , 'Partitions' );
		if( !fs.existsSync( partitionsDir ) ) {
			return {
				partitions : [] ,
				errors : [],
			};
		}
		return {
			partitions : fs.readdirSync( partitionsDir , { withFileTypes : true } )
				.filter( entry => entry.isDirectory() && entry.name.startsWith( AI_PARTITION_PREFIX ) )
				.map( entry => `${ PERSISTENT_PARTITION_PREFIX }${ entry.name }` ) ,
			errors : [],
		};
	} catch ( error ) {
		console.warn( '[AIViews] Failed to scan persisted AI partitions:' , error );
		return {
			partitions : [] ,
			errors : [
				{
					target : 'persisted AI partition directory' ,
					error : stringifyUnknownError( error ),
				},
			],
		};
	}
};

const clearSessionPartitions = async(partitions:string[]):Promise<ResetAISessionDataResult> => {
	const errors:ResetAISessionDataError[] = [];

	for( const partition of partitions ) {
		try {
			const ses = session.fromPartition( partition );
			await ses.clearStorageData();
			await ses.clearCache();
			await ses.clearAuthCache();
		} catch ( error ) {
			errors.push( {
				target : partition ,
				error : stringifyUnknownError( error ),
			} );
			console.warn( '[AIViews] Failed to clear session data for partition:' , partition , error );
		}
	}

	return {
		success : errors.length === 0 ,
		partitions ,
		errors,
	};
};

const stringifyUnknownError = (error:unknown) => {
	return error instanceof Error ? error.message : String( error );
};

const uniqueStrings = (items:string[]) => {
	return Array.from( new Set( items.filter( Boolean ) ) );
};

const getRuntimeAIProxyKey = (ai:AI.AIItem , settings:Settings) => {
	return JSON.stringify( resolveAIProxy( ai , settings ) );
};

const getRuntimeAIPageEnvironment = (settings:Settings) => {
	return getAIPageEnvironment( settings.appearance );
};

const setAIPageEnvironmentForView = (
	view:WebContentsView ,
	environment:AIPageEnvironment,
) => {
	aiPageEnvironmentByWebContents.set( view.webContents , environment );
};

const getAIPageEnvironmentForWebContents = (webContents:WebContents) => {
	return aiPageEnvironmentByWebContents.get( webContents ) || null;
};

const sendAIPageEnvironmentToView = (
	view:WebContentsView ,
	environment:AIPageEnvironment ,
	id:string,
) => {
	if( view.webContents.isDestroyed() ) {
		return;
	}
	useIpcMainToRenderer( 'ai-page-environment-change' ).targets( [
		view.webContents,
	] ).send( environment );
	console.info( '[AIViews] Sent AI page environment update:' , id );
};

const closeRuntimeWebContentsView = (
	view:WebContentsView ,
	id:string ,
	context:string,
) => {
	try {
		mainWindow.contentView.removeChildView( view );
		aiPageEnvironmentByWebContents.delete( view.webContents );
		if( !view.webContents.isDestroyed() ) {
			view.webContents.close();
		}
	} catch ( error ) {
		console.warn( '[AIViews] Failed to close AI view:' , context , id , error );
	}
};

/* =================================================================
   FocusMonitor 集成层
   模块级 WebContents → viewId 映射 + focus() 调用包装
   ================================================================= */

/* 模块加载时提前初始化 FocusMonitor 并注册 IPC 监听 */
try {
	const mod = require( './focus-monitor.retexel' );
	if( mod && mod.getFocusMonitor ) {
		mod.getFocusMonitor( { enabled : true } );
	}
} catch {
	/* 非 dev 环境或模块未编译时静默降级 */
}

/** WebContents → AI view ID 映射（由 instrumentViewWithMonitor 注册） */
const focusViewIdByWebContents = new WeakMap<WebContents , string>();

/** FocusMonitor 实例引用 */
let focusMonitorInstance: { instrumentView: (view: WebContentsView, viewId: string) => void; wrapFocus: (view: WebContentsView, viewId: string, source: string, fn: () => void) => void; } | null = null;

/**
 * 确保 FocusMonitor 实例已就绪
 * 实例在模块加载时由模块级代码初始化，此函数仅获取引用
 */
function ensureFocusMonitor(): void {
	if( focusMonitorInstance !== undefined ) return;

	/* 尝试在运行时再次初始化（模块级初始化可能因 require 失败未生效） */
	try {
		const mod = require( './focus-monitor.retexel' );
		if( mod && mod.getFocusMonitor ) {
			const monitor = mod.getFocusMonitor( { enabled : true } );
			if( monitor && typeof monitor.instrumentView === 'function' ) {
				focusMonitorInstance = monitor;
				return;
			}
		}
	} catch {
		/* 静默降级 */
	}
	focusMonitorInstance = null;
}

/**
 * 注册 view 到 FocusMonitor（由 createRuntimeAIView 调用）
 */
function instrumentViewWithMonitor( view: WebContentsView, viewId: string ): void {
	focusViewIdByWebContents.set( view.webContents, viewId );
	ensureFocusMonitor();
	if( focusMonitorInstance ) {
		focusMonitorInstance.instrumentView( view, viewId );
	}
}

/**
 * 通过 view.webContents 反向查询 viewId
 */
function getViewIdByWebContents( webContents: WebContents ): string {
	return focusViewIdByWebContents.get( webContents ) || 'unknown';
}

/**
 * 包装后的 focus() 调用 — 在调用前后检测焦点窃取
 */
function focusViewWithMonitor( view: WebContentsView, source: string ): void {
	ensureFocusMonitor();
	const viewId = getViewIdByWebContents( view.webContents );

	if( focusMonitorInstance ) {
		focusMonitorInstance.wrapFocus( view, viewId, source, () => {
			view.webContents.focus();
		} );
	} else {
		view.webContents.focus();
	}
}

/* =================================================================
   AI 视图焦点管理函数
   ================================================================= */

const focusRuntimeAIViewIfReady = (runtimeView:RuntimeAIView) => {
	if( !runtimeView.ready ) {
		return;
	}
	focusAIViewIfReady( runtimeView.view , 'apply-visibility' );
};

const focusAIViewIfReady = (view:WebContentsView , source:string = 'unknown') => {
	if( view.webContents.isDestroyed() || view.webContents.isLoading() ) {
		return;
	}
	focusViewWithMonitor( view , source );
};

const focusAIViewIfCurrent = (aiId:string , view:WebContentsView) => {
	if(
		Reaxel_View.store.currentAIViewKey !== aiId
		|| Reaxel_View.store.settingsViewOpened
		|| !mainWindow.isFocused()
	) {
		return;
	}
	focusAIViewIfReady( view , 'did-stop-loading' );
};

export type FocusMonitorFocusSource =
	| 'did-stop-loading'
	| 'apply-visibility'
	| 'focus-current-content-view'
	| 'prompt-view-close'
	| 'explicit'
	| 'unknown';

/* Export: 供 Views/index.ts 等外部模块使用的 focus 包装函数 */
export function safeFocusViewWithMonitor(
	view: WebContentsView,
	source: FocusMonitorFocusSource = 'unknown',
): void {
	ensureFocusMonitor();
	const viewId = getViewIdByWebContents( view.webContents );

	if( focusMonitorInstance && viewId !== 'unknown' ) {
		focusMonitorInstance.wrapFocus( view, viewId, source, () => {
			if( !view.webContents.isDestroyed() ) {
				view.webContents.focus();
			}
		} );
	} else if( !view.webContents.isDestroyed() ) {
		view.webContents.focus();
	}
}
export type RuntimeAIView = {
	id: string;
	label: string;
	AIName: AI.AIFamily;
	view: WebContentsView;
	domain: string;
	partition: string;
	config: AI.AIItem;
	proxyKey: string;
	appearanceKey: string;
	ready: boolean;
};

type CreateRuntimeAIViewOptions = {
	loadURL?: string;
	visible?: boolean;
};

type ResetAISessionDataError = {
	target: string;
	error: string;
};

type ResetAISessionDataResult = {
	success: boolean;
	partitions: string[];
	errors: ResetAISessionDataError[];
};

type PersistedAIPartitionDiscoveryResult = {
	partitions: string[];
	errors: ResetAISessionDataError[];
};

import { getAIDomainByFamily } from './data';
import type { AI } from '#src/Types/SettingsTypes/AI';
import type { Settings } from '#src/Types/SettingsTypes';
import { initWebContentsView } from '#main/reaxels/Views/utils/initWebContentsView';
import {
	applyAIProxyToView ,
	resolveAIProxy,
} from '#main/services/settings/proxy-service';
import {
	applyAIPageEnvironmentToView ,
	getAIPageEnvironment ,
	getAIPageAppearanceKey ,
} from '#main/services/appearance';
import { applyBrowserIdentityToView } from '#main/services/browser-identity';
import {
	useIpcMainToRenderer ,
	useIpcSync,
} from '#main/services/ipc';
import { mainWindow } from '#main/mainWindow';
import { Reaxel_View } from '../';
import {
	createReaxable ,
	reaxel,
} from 'reaxes';
import {
	session ,
	app ,
	type WebContents ,
	type WebContentsView,
} from 'electron';
import type { AIPageEnvironment } from '#src/Types/AIPageEnvironment';
import * as fs from 'node:fs';
import * as path from 'node:path';
