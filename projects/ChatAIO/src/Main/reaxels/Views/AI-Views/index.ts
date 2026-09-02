export const reaxel_AIViews = reaxel( () => {
	const {
		store ,
		setState ,
		mutate,
	} = createReaxable( {
		AIViews : checkAs<RuntimeAIView[]>( [] ),
	} );

	useIpcSync( 'get-ai-page-environment' ).handle( ( { event } ) => {
		return getRegisteredAIPageEnvironment( event.sender );
	} );

	const initAIView = ( ai:AI.AIItem , settings:Settings ) => {
		console.log( '[AIViews] initAIView start:' , ai.id , ai.url );
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
		clearPreloadFreezeTimer( runtimeView.view );
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
			clearPreloadFreezeTimer( rv.view );
			closeRuntimeWebContentsView( rv.view , rv.id , 'reset' );
		} );

		mutate( s => {
			s.AIViews = [];
		} );

		return await clearSessionPartitions( collectResult.partitions );
	};

	const syncAIViewsWithConfig = async( settings:Settings ) => {
		if( Reaxel_View().areRuntimeViewsInitialized() === false ) {
			console.log( '[AIViews] skip syncAIViewsWithConfig until initRuntimeViews (menubar visual-ready gate)' );
			return;
		}
		console.log( '[AIViews] syncAIViewsWithConfig start. AI count:' , settings.AIs.length );
		const activeAIs = settings.AIs.filter( ai => !ai.disabled );
		const activeIds = new Set( activeAIs.map( ai => ai.id ) );

		store.AIViews.slice().forEach( runtimeView => {
			if( !activeIds.has( runtimeView.id ) ) {
				try {
					destroyAIView( runtimeView.id );
				} catch ( error ) {
					console.error( `[AIViews] Failed to destroy AI view: ${ runtimeView.id }` , error );
				}
			}
		} );

		const currentAI = resolveCurrentAI( settings );
		if( currentAI && Reaxel_View.store.currentAIViewKey !== currentAI.id ) {
			Reaxel_View.setState( { currentAIViewKey : currentAI.id } );
		}

		for( const ai of activeAIs ) {
			const runtimeView = store.AIViews.find( item => item.id === ai.id );
			if( runtimeView ) {
				try {
					await updateRuntimeAIView( runtimeView , ai , settings );
				} catch ( error ) {
					console.error( `[AIViews] Failed to update AI view: ${ ai.id } (${ ai.label })` , error );
				}
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

		try {
			applyVisibility();
		} catch ( error ) {
			console.error( '[AIViews] applyVisibility failed:' , error );
		}
		try {
			Reaxel_View().presentActiveCenterView( 'recover' );
		} catch ( error ) {
			console.error( '[AIViews] presentActiveCenterView recover failed:' , error );
		}
	};

	const showAIView = ( aiId:string , settings:Settings ) => {
		const ai = settings.AIs.find( item => item.id === aiId && !item.disabled );
		if( !ai ) {
			return null;
		}
		/* 抑制 store 兜底 reaction（setState 内同步触发），由下方显式 present('switch')
		   负责唯一一次 mount，避免双重 remount。 */
		Reaxel_View().setCenterStateForImperativeSwitch( {
			currentAIViewKey : ai.id ,
			settingsViewOpened : false,
		} );
		const view = initAIView( ai , settings );
		applyVisibility();
		/* 必须在 FloatingView show 前同步 switch，避免 remount 打在 overlay 之后 */
		Reaxel_View().presentActiveCenterView( 'switch' );
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
		const nextRuntimeView = runtimeViews.length > 1
			? runtimeViews[( currentIndex + 1 ) % runtimeViews.length]
			: null;
		/* 抑制 store 兜底 reaction，由下方显式 present('switch') 负责唯一一次 mount */
		Reaxel_View().setCenterStateForImperativeSwitch( {
			currentAIViewKey : nextRuntimeView ? nextRuntimeView.id : '' ,
			settingsViewOpened : false,
		} );
		applyVisibility();
		Reaxel_View().presentActiveCenterView( 'switch' );
		return true;
	};

	/* AI 列表可见性：只 park 未首展预加载。load 中且有盖才 visible，load 完 hidden。
	   已首展闲置页的 detach 归 present。禁止在此 addChildView。 */
	let lastAppliedVisibilityKey: string | null = null;
	let lastAppliedSettingsOpened: boolean | null = null;
	let lastAppliedViewCount: number = -1;

	const applyVisibility = () => {
		const currentAIViewKey = Reaxel_View.store.currentAIViewKey;
		const settingsOpened = Reaxel_View.store.settingsViewOpened;
		const viewCount = store.AIViews.length;

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
			if( !runtimeView.view || runtimeView.hasPresented ) {
				return;
			}
			if( settingsOpened || runtimeView.id !== currentAIViewKey ) {
				Reaxel_View().parkUnpresentedPreloadView( runtimeView.view );
			}
		} );
	};

	/**
	 * 等当前已创建的启动 AI WCV 都 `ready`（did-stop-loading / did-fail-load）。
	 * 不能把「尚未 loadURL、isLoading=false」当成结束，否则 Settings preload 会跟 AI 抢加载。
	 * 超时仍 resolve(false)，调用方继续 preload Settings。
	 * 设计：docs/features/settings-view-preload.md
	 */
	const waitUntilStartupAIViewsSettled = ( options:{ timeoutMs?:number } = {} ) => {
		const timeoutMs = options.timeoutMs ?? 15000;
		const views = store.AIViews.slice();
		if( views.length === 0 ) {
			return Promise.resolve( true );
		}

		const isViewSettled = ( runtimeView:RuntimeAIView ) => {
			if( runtimeView.ready ) {
				return true;
			}
			return isWebContentsViewDead( runtimeView.view );
		};

		if( views.every( isViewSettled ) ) {
			return Promise.resolve( true );
		}

		return new Promise<boolean>( resolve => {
			let settled = false;
			let timer : ReturnType<typeof setTimeout>;
			const finish = ( ok:boolean ) => {
				if( settled ) {
					return;
				}
				settled = true;
				clearTimeout( timer );
				views.forEach( runtimeView => {
					const webContents = getAliveWebContents( runtimeView.view );
					if( !webContents ) {
						return;
					}
					webContents.removeListener( 'did-stop-loading' , onMaybeDone );
					webContents.removeListener( 'did-fail-load' , onMaybeDone );
				} );
				resolve( ok );
			};
			const onMaybeDone = () => {
				if( views.every( isViewSettled ) ) {
					finish( true );
				}
			};
			timer = setTimeout( () => {
				console.warn(
					`[AIViews] waitUntilStartupAIViewsSettled timed out after ${ timeoutMs }ms;`
					+ ' continuing SettingsView preload',
				);
				finish( false );
			} , timeoutMs );
			views.forEach( runtimeView => {
				if( isViewSettled( runtimeView ) ) {
					return;
				}
				const webContents = getAliveWebContents( runtimeView.view );
				if( !webContents ) {
					return;
				}
				webContents.on( 'did-stop-loading' , onMaybeDone );
				webContents.on( 'did-fail-load' , onMaybeDone );
			} );
			onMaybeDone();
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
		applyVisibility ,
		waitUntilStartupAIViewsSettled,
	};

	const createRuntimeAIView = (
		ai:AI.AIItem ,
		settings:Settings ,
		options:CreateRuntimeAIViewOptions = {},
	):RuntimeAIView => {
		const domain = ai.url; // 空 url 由 normalizeAIItem 按供应商目录行补齐，禁止 family 域名表回退。region 不进实例，阻断回查目录行。见提案。
		const loadDomain = options.loadURL || domain;
		const partition = getAIPartition( ai.id );
		const environment = getRuntimeAIPageEnvironment( settings );
		const view = initWebContentsView( {
			type : 'AI-View' ,
			domain : loadDomain ,
			aiConfig : ai ,
			settings ,
			refreshBounds : view => {
				if(
					ai.id === Reaxel_View.store.currentAIViewKey
					&& !Reaxel_View.store.settingsViewOpened
				) {
					Reaxel_View().fitContentView( view );
					return;
				}
				const runtimeView = store.AIViews.find( item => item.view === view );
				if( runtimeView && !runtimeView.hasPresented ) {
					Reaxel_View().parkUnpresentedPreloadView( view );
				}
			} ,
			webPreferences : {
				partition,
			},
		} );
		const browserIdentity = applyBrowserIdentityToView(
			view ,
			loadDomain ,
			environment.acceptLanguages,
		);
		const environmentWithIdentity = mergeBrowserIdentityIntoEnvironment(
			environment ,
			browserIdentity,
		);
		setAIPageEnvironmentForView( view , environmentWithIdentity );
		sendAIPageEnvironmentToView( view , environmentWithIdentity , ai.id );
		if( typeof options.visible === 'boolean' ) {
			view.setVisible( options.visible );
		}
		/* FocusMonitor / WhiteScreenMonitor: 注册新创建的 AI view */
		instrumentViewWithMonitor( view , ai.id );
		instrumentViewWithWhiteScreenMonitor( view , ai.id );
		bindRuntimeAIViewReadyHandlers( ai.id , view );
		if(
			ai.id !== Reaxel_View.store.currentAIViewKey
			|| Reaxel_View.store.settingsViewOpened
		) {
			Reaxel_View().parkUnpresentedPreloadView( view );
		}
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
			ready : false ,
			/* 未首展：load 中盖下可见暖机；load 完 hidden 减合成层。detach 会饿死后台 load / SPA */
			hasPresented : false,
		};
	};

	const PRELOAD_FREEZE_AFTER_LOAD_MS = 400;
	const preloadFreezeTimers = new WeakMap<WebContentsView , ReturnType<typeof setTimeout>>();

	const clearPreloadFreezeTimer = (view:WebContentsView | null | undefined) => {
		if( !view ) {
			return;
		}
		const timer = preloadFreezeTimers.get( view );
		if( timer ) {
			clearTimeout( timer );
			preloadFreezeTimers.delete( view );
		}
	};

	const schedulePreloadFreezeAfterHydrate = (view:WebContentsView) => {
		clearPreloadFreezeTimer( view );
		const timer = setTimeout( () => {
			preloadFreezeTimers.delete( view );
			Reaxel_View().parkUnpresentedPreloadView( view );
		} , PRELOAD_FREEZE_AFTER_LOAD_MS );
		preloadFreezeTimers.set( view , timer );
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
		const onLoadSettled = () => {
			markViewReady();
			const runtimeView = store.AIViews.find( item => item.id === aiId );
			if( runtimeView?.view === view && !runtimeView.hasPresented ) {
				schedulePreloadFreezeAfterHydrate( view );
			}
		};
		view.webContents.on( 'did-stop-loading' , onLoadSettled );
		view.webContents.on( 'did-fail-load' , onLoadSettled );
	};

	const updateRuntimeAIView = async(
		runtimeView:RuntimeAIView ,
		ai:AI.AIItem ,
		settings:Settings,
	) => {
		const nextDomain = ai.url;
		const nextProxyKey = getRuntimeAIProxyKey( ai , settings );
		const nextEnvironment = getRuntimeAIPageEnvironment( settings );
		const nextAppearanceKey = getAIPageAppearanceKey( nextEnvironment );
		const domainChanged = runtimeView.domain !== nextDomain;
		const proxyChanged = runtimeView.proxyKey !== '' && runtimeView.proxyKey !== nextProxyKey;
		const appearanceChanged = runtimeView.appearanceKey !== '' && runtimeView.appearanceKey !== nextAppearanceKey;

		const resolvedProxy = await applyAIProxyToView( runtimeView.view , ai , settings );
		const appliedProxyKey = JSON.stringify( resolvedProxy );
		const browserIdentity = applyBrowserIdentityToView(
			runtimeView.view ,
			nextDomain ,
			nextEnvironment.acceptLanguages,
		);
		const environmentWithIdentity = mergeBrowserIdentityIntoEnvironment(
			nextEnvironment ,
			browserIdentity,
		);
		applyAIPageEnvironmentToView( runtimeView.view , nextEnvironment );
		const appliedAppearanceKey = getAIPageAppearanceKey( nextEnvironment );
		applyRuntimeAIViewConfig( runtimeView , ai , nextDomain , appliedProxyKey , appliedAppearanceKey );
		setAIPageEnvironmentForView( runtimeView.view , environmentWithIdentity );

		if( appearanceChanged || domainChanged ) {
			sendAIPageEnvironmentToView( runtimeView.view , environmentWithIdentity , runtimeView.id );
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

const safeLoadAIURL = async(
	view:WebContentsView ,
	url:string ,
	context:string,
) => {
	/* 供应商 ISO 覆盖在 catalog.region；是否阻断用 getAIConfigService().isAICountryBlockedByCatalog。
	 * 出口探测 + 本地 data:text/html 阻断页见 sensitive-region-access-blocking.md。不要改远程 URL 去 google available-regions。 */
	try {
		getMenubarColdStartMonitor().noteWcvLoadAttempt( view , url , context );
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
	registerAIPageEnvironmentForWebContents( view.webContents , environment );
};

const sendAIPageEnvironmentToView = (
	view:WebContentsView ,
	environment:AIPageEnvironment ,
	id:string,
) => {
	if( isWebContentsViewDead( view ) ) {
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
		const webContents = view.webContents;
		if( webContents ) {
			deleteRegisteredAIPageEnvironment( webContents );
			if( !webContents.isDestroyed() ) {
				webContents.close();
			}
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

/**
 * WhiteScreenMonitor：生产/开发一律启用（静态导入进 prod main bundle）。
 * 只注册 viewId；调度链埋点在 Reaxel_View（唯一 mount 所有者），避免双重侵入。
 * 日志：userData/logs/white-screen-monitor.jsonl
 */
const whiteScreenMonitorInstance = getWhiteScreenMonitor();
console.info(
	'[AIViews] WhiteScreenMonitor ready:' ,
	`enabled=${ whiteScreenMonitorInstance.enabled }` ,
	`mode=schedule-trace` ,
	`packaged=${ app.isPackaged }` ,
);

/** WebContents → AI view ID 映射（由 instrumentViewWithMonitor 注册） */
const focusViewIdByWebContents = new WeakMap<WebContents , string>();

/** FocusMonitor 实例引用 */
let focusMonitorInstance: {
	instrumentView: (view: WebContentsView, viewId: string) => void;
	wrapFocus: (view: WebContentsView, viewId: string, source: string, fn: () => void) => void;
} | null = null;
let focusMonitorResolved = false;

/**
 * 确保 FocusMonitor 实例已就绪
 */
function ensureFocusMonitor(): void {
	if( focusMonitorResolved ) return;
	focusMonitorResolved = true;

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

function instrumentViewWithWhiteScreenMonitor( view: WebContentsView, viewId: string ): void {
	if( whiteScreenMonitorInstance.enabled ) {
		whiteScreenMonitorInstance.instrumentView( view, viewId );
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
	const webContents = getAliveWebContents( view );
	if( !webContents ) {
		return;
	}
	const viewId = getViewIdByWebContents( webContents );

	if( focusMonitorInstance ) {
		focusMonitorInstance.wrapFocus( view, viewId, source, () => {
			if( !isWebContentsViewDead( view ) ) {
				view.webContents.focus();
			}
		} );
	} else {
		webContents.focus();
	}
}

/* =================================================================
   AI 视图焦点管理函数
   ================================================================= */

const focusAIViewIfReady = (view:WebContentsView , source:string = 'unknown') => {
	const webContents = getAliveWebContents( view );
	if( !webContents || webContents.isLoading() ) {
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
	| 'window-focus-input'
	| 'explicit'
	| 'unknown';

/* Export: 供 Views/index.ts 等外部模块使用的 focus 包装函数 */
export function safeFocusViewWithMonitor(
	view: WebContentsView,
	source: FocusMonitorFocusSource = 'unknown',
): void {
	const webContents = getAliveWebContents( view );
	if( !webContents ) {
		return;
	}
	ensureFocusMonitor();
	const viewId = getViewIdByWebContents( webContents );

	if( focusMonitorInstance && viewId !== 'unknown' ) {
		focusMonitorInstance.wrapFocus( view, viewId, source, () => {
			if( !isWebContentsViewDead( view ) ) {
				view.webContents.focus();
			}
		} );
	} else {
		webContents.focus();
	}
}

export type {
	ViewScheduleTrigger ,
	ViewHierarchySnapshot ,
	WhiteScreenProbeTrigger ,
	WhiteScreenHierarchySnapshot ,
} from './white-screen-monitor.retexel';

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
	/** 是否曾作为中心页成功 present（有 compositor 缓冲后切走才可硬 detach） */
	hasPresented: boolean;
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

import { getWhiteScreenMonitor } from './white-screen-monitor.retexel';
import { getMenubarColdStartMonitor } from '#main/reaxels/Views/Main-View/menubar-cold-start-monitor.retexel';
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
import {
	applyBrowserIdentityToView ,
	mergeBrowserIdentityIntoEnvironment,
} from '#main/services/browser-identity';
import {
	deleteRegisteredAIPageEnvironment ,
	getRegisteredAIPageEnvironment ,
	registerAIPageEnvironmentForWebContents,
} from './ai-page-environment';
import {
	useIpcMainToRenderer ,
	useIpcSync,
} from '#main/services/ipc';
import { mainWindow } from '#main/mainWindow';
import {
	getAliveWebContents ,
	isWebContentsViewDead,
} from '#main/services/web-contents-view-alive.utility';
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
