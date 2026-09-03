/**
 * SettingsView 业务。页脚 dirty 与 Manage AIs 表 dirty 分开；弹窗 Save 当场 persist。
 * 见 docs/features/manage-ais-save-scopes.md
 */
export const reaxel_SettingsView = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		RootMenu : {
			current : checkAs<Menus>( 'general' ) ,
			menus : [
				{
					label : 'General' ,
					value : checkAs<Menus>( 'general' ),
				} ,
				{
					label : 'Networks' ,
					value : checkAs<Menus>( 'net' ),
				} ,
				{
					label : 'Manage AIs' ,
					value : checkAs<Menus>( 'mngeai' ),
				},
				{
					label : 'About' ,
					value : checkAs<Menus>( 'about' ),
				},
			],
		} ,
		VersionUI : {
			activeTab : checkAs<AppUpdater.VersionTab>( 'current' ) ,
			drawerOpen : false ,
		} ,
		UIControls : {
			networks : {
				proxy_mode : checkAs<NetworkProxy.GlobalProxyMode>( 'direct' ) ,
				using_proxy_server_id : checkAs<string>( null ) ,
				proxy_fields : defaultGlobalProxyFields() ,
				check_connection : {
					modal_visible : false ,
					address : '' ,
					pending : false ,
					success : false ,
					error : null,
				} ,
				proxy_test_urls : defaultProxyTestURLs(),
				edit_proxy_server_modal : {
					visible : false ,
					mode : checkAs<"edit" | "add">( 'edit' ) ,
					editing_id : null ,
					fields : {
						server_name : '' ,
						enabled : true ,
						proxy_conf : defaultProxyConf(),
					},
				} ,
				proxy_server_list : defaultProxyServers(),
			} ,
			manage_AIs : {
				startupAIPageLoadMode : checkAs<Startup.AIPageLoadMode>( 'last-used-ai' ) ,
				/** 待删除 AI ID 列表 — 标记后仅在表底 Save 时过滤持久化，UI 中仍可见（可撤销）。见 docs/features/manage-ais-save-scopes.md */
				pendingDeleteAIIds : checkAs<string[]>( [] ) ,
				/**
				 * Manage AIs 表头列筛选。只改展示 dataSource，不 persist、不计 dirty。
				 * 面板是 reaxper，从本 store 读 value/open；不要用 React Context / 父级 useState 灌值。
				 * 见 docs/features/manage-ais-table-ux.md
				 */
				column_filter : {
					open : createEmptyManageAIsColumnFilterOpen() ,
					value : createEmptyManageAIsColumnFilters() ,
				} ,
				/** 目录更新预览。checking/applying 是 IPC in-flight 唯一真相。checking 不锁侧栏。见 docs/features/ai-catalog-manual-update.md */
				catalog_update : {
					checking : false ,
					applying : false ,
					preview : checkAs<AICatalog.CatalogUpdateCheckResult | null>( null ),
				} ,
				edit_AI_modal : {
					visible : false ,
					mode : checkAs<"edit" | "add">( 'edit' ) ,
					editing_id : null ,
					fields : defaultAIFields(),
				},
			} ,
			appearance : {
				darkmode : false ,
				theme : checkAs<Appearance.Theme>( 'system' ) ,
				show_quickswitch_tag : true ,
				show_current_tag : true ,
				language : checkAs<Appearance.Language>( 'follow-system' ),
			} ,
			system : {
				gpu_acceleration : true ,
				show_tray : true ,
				close_to_tray : true,
			} ,
			hotkeys : {},
		} ,
		Data : {
			AIs : checkAs<AI.AIItem[]>( [] ),
		} ,
		Environment : {
			systemLanguage : checkAs<Languages>( 'en-US' ) ,
			systemTheme : checkAs<'light' | 'dark'>( 'light' ),
		} ,
		get_settings_status : {
			pending : false ,
			error : false,
		} ,
		submit_settings_status : {
			pending : false ,
			error : false,
		},
	} );
	
	rehancer_Dev( { store , setState , mutate } )();

	/* 两套 dirty：页脚 runtime vs 表内 AIs。见 docs/features/manage-ais-save-scopes.md */
	let _lastSavedSettingsSnapshot = '';
	let _lastSavedAIsSnapshot = '';
	// 已提交(已生效)的 AI IDs 集合，用于前端判断哪些 AI 是新增未保存的
	let _committedAIIds = new Set<string>();
	// 已提交的 AI 快照，用于判断是否已修改
	let _committedAISnapshot = new Map<string , string>();
	/* Manage AIs 置底只看上次表底 Save / 弹窗 persist 的 disabled；未保存 toggle 不跳行。见 docs/features/manage-ais-table-ux.md */
	let _committedDisabledById = new Map<string , boolean>();
	let _proxyTestURLSubmitQueue:Promise<unknown> = Promise.resolve();
	let _aiOrderPersistQueue:Promise<unknown> = Promise.resolve();
	let _aiOrderPersistGeneration = 0;
	let _catalogCheckGeneration = 0;
	let _catalogApplyGeneration = 0;
	
	function updateSettingsSnapshot() {
		_lastSavedSettingsSnapshot = JSON.stringify( buildDirtyRuntimeSnapshot() );
	}

	function updateAIsSnapshotFromStore() {
		_committedAIIds = new Set( store.Data.AIs.map( ai => ai.id ) );
		_committedAISnapshot = new Map(
			store.Data.AIs.map( ai => [ ai.id , JSON.stringify( ai ) ] ),
		);
		_committedDisabledById = new Map(
			store.Data.AIs.map( ai => [ ai.id , Boolean( ai.disabled ) ] ),
		);
		_lastSavedAIsSnapshot = fingerprintAIsDirtyState( store.Data.AIs , [] );
	}

	function isDirty(): boolean {
		if( !_lastSavedSettingsSnapshot ) return false;
		return JSON.stringify( buildDirtyRuntimeSnapshot() ) !== _lastSavedSettingsSnapshot;
	}

	function isAIsDirty(): boolean {
		if( !_lastSavedAIsSnapshot ) return false;
		return fingerprintAIsDirtyState(
			store.Data.AIs ,
			store.UIControls.manage_AIs.pendingDeleteAIIds,
		) !== _lastSavedAIsSnapshot;
	}

	function hasBlockingUnsavedChanges(): boolean {
		return isDirty() || isAIsDirty();
	}

	function buildDirtyRuntimeSnapshot() {
		return snapshotRuntimeSettingsForDirty( buildSettingsFromStore() );
	}
	
	~async function loadSettingsOnStartup() {
		await reloadSettings();
	}();
	
	if( typeof window !== 'undefined' && window.matchMedia ) {
		const darkSchemeQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
		darkSchemeQuery.addEventListener?.( 'change' , () => {
			// matchMedia 只作为变化信号，系统主题值通过 IPC 从主进程获取。
			void refreshAppearanceEnvironment();
		} );
	}

	async function fetchSettings() {
		return await fetchSettingsService();
	}
	
	async function reloadRuntimeSettings() {
		setState.get_settings_status( {
			pending : true ,
			error : false,
		} );
		try {
			const [ environment , settings ] = await Promise.all( [
				getAppearanceEnvironment(),
				fetchSettings(),
			] );
			setState.Environment( environment );
			applyRuntimeSettingsToStore( settings );
			setState.get_settings_status( {
				pending : false ,
				error : false,
			} );
			return settings;
		} catch ( error ) {
			console.error( '[SettingsView] Failed to reload runtime settings:' , error );
			setState.get_settings_status( {
				pending : false ,
				error : true,
			} );
			throw error;
		}
	}

	async function reloadAIs() {
		const ais = await getAIs();
		applyAIsToStore( Array.isArray( ais ) ? ais : [] );
		return ais;
	}

	async function reloadSettings() {
		setState.get_settings_status( {
			pending : true ,
			error : false,
		} );
		try {
			const [ environment , settings ] = await Promise.all( [
				getAppearanceEnvironment(),
				fetchSettings(),
			] );
			setState.Environment( environment );
			setSettings( settings );
			setState.get_settings_status( {
				pending : false ,
				error : false,
			} );
			return settings;
		} catch ( error ) {
			console.error( '[SettingsView] Failed to load settings:' , error );
			setState.get_settings_status( {
				pending : false ,
				error : true,
			} );
			throw error;
		}
	}

	async function refreshAppearanceEnvironment() {
		try {
			const environment = await getAppearanceEnvironment();
			setState.Environment( environment );
			if( store.UIControls.appearance.theme === 'system' ) {
				applyThemePreferenceToDocument( 'system' , environment.systemTheme );
			}
			return environment;
		} catch ( error ) {
			console.error( '[SettingsView] Failed to refresh appearance environment:' , error );
			return store.Environment;
		}
	}
	
	function applyRuntimeSettingsToStore( settings:SettingsFetchResult | Settings ) {
		const proxyServerList = settings.networks.proxy_server_list || defaultProxyServers();
		setState.UIControls.networks( {
			proxy_mode : settings.networks.global_proxy.proxy_mode ,
			using_proxy_server_id : getEnabledProxyServerId(
				settings.networks.global_proxy.proxy_server_id || null ,
				proxyServerList,
			) ,
			proxy_fields : {
				...defaultGlobalProxyFields() ,
				...( settings.networks.global_proxy.user_fill_proxy || {} ),
			} ,
			proxy_server_list : proxyServerList,
			proxy_test_urls : {
				...defaultProxyTestURLs() ,
				...( settings.networks.proxy_test_urls || {} ),
			},
		} );
		setState.UIControls.appearance( {
			darkmode : settings.appearance.darkmode ,
			theme : settings.appearance.theme || normalizeThemePreference( undefined , settings.appearance.darkmode ) ,
			language : settings.appearance.language,
		} );
		setState.UIControls.system( settings.system );
		setState.UIControls.manage_AIs( {
			startupAIPageLoadMode : settings.startup?.aiPageLoadMode || 'last-used-ai',
		} );
		
		// 同步 i18n 语言到渲染进程的 i18n 模块
		// 以持久化配置 (user-settings.json) 为单一数据源
		if (settings.appearance.language) {
			reaxel_I18n().setLanguage(resolveLanguagePreference(
				settings.appearance.language ,
				store.Environment.systemLanguage,
			) as any);
		}
		applyThemePreferenceToDocument( settings.appearance.theme , store.Environment.systemTheme );
		previewPromptAppearance( {
			theme : settings.appearance.theme ,
			language : settings.appearance.language,
		} );
		
		updateSettingsSnapshot();
	}

	function applyAIsToStore( ais:AI.AIItem[] ) {
		mutate( s => {
			s.Data.AIs = ais || [];
		} );
		setState.UIControls.manage_AIs( { pendingDeleteAIIds : [] } );
		updateAIsSnapshotFromStore();
	}

	function setSettings( settings:SettingsFetchResult | Settings ) {
		applyRuntimeSettingsToStore( settings );
		applyAIsToStore( settings.AIs || [] );
	}

	async function setTheme( theme:Appearance.Theme ) {
		const environment = theme === 'system'
			? await refreshAppearanceEnvironment()
			: store.Environment;
		const resolvedTheme = resolveThemePreference( theme , environment.systemTheme );
		setState.UIControls.appearance( {
			theme ,
			darkmode : resolvedTheme === 'dark',
		} );
		applyThemePreferenceToDocument( theme , environment.systemTheme );
		previewPromptAppearanceFromStore( {
			theme,
		} );
	}

	function setLanguage( language:Appearance.Language ) {
		setState.UIControls.appearance( { language } );
		reaxel_I18n().setLanguage(resolveLanguagePreference(
			language ,
			store.Environment.systemLanguage,
		) as any);
		previewPromptAppearanceFromStore( { language } );
	}
	
	function buildSettingsFromStore():Settings {
		const networks = store.UIControls.networks;
		const raw = {
			networks : {
				global_proxy : {
					proxy_mode : networks.proxy_mode ,
					proxy_server_id : getEnabledProxyServerId(
						networks.using_proxy_server_id ,
						networks.proxy_server_list,
					) ,
					user_fill_proxy : {
						...defaultGlobalProxyFields() ,
						...networks.proxy_fields ,
						no_proxy_for : networks.proxy_fields.no_proxy_for || [] ,
						no_proxy_for__enabled : networks.proxy_fields.no_proxy_for__enabled !== false,
					},
				} ,
				proxy_server_list : networks.proxy_server_list,
				proxy_test_urls : networks.proxy_test_urls,
			} ,
			AIs : store.Data.AIs.filter( ai => !store.UIControls.manage_AIs.pendingDeleteAIIds.includes( ai.id ) ).map( ai => ( {
				...ai ,
				from_server_list_proxy : getEnabledProxyServerId(
					ai.from_server_list_proxy ,
					networks.proxy_server_list,
				),
			} ) ) ,
			system : store.UIControls.system ,
			startup : {
				aiPageLoadMode : store.UIControls.manage_AIs.startupAIPageLoadMode,
			} ,
			appearance : {
				darkmode : store.UIControls.appearance.darkmode ,
				theme : store.UIControls.appearance.theme ,
				language : store.UIControls.appearance.language,
			},
		};
		// 去除 observable 包装, 使数据可通过 IPC 结构化克隆传输。
		return cloneForIPC( raw );
	}
	
	/**
	 * 放弃未保存编辑并关闭设置页。先 reload 磁盘配置以复位 reaxel 状态与 PromptView 预览，再 exit。
	 * 若目录预览还开着，先丢掉 main pending（与 Modal 取消同一条路径）。
	 */
	function dismissCatalogUpdate() {
		if( store.UIControls.manage_AIs.catalog_update.applying ) {
			return;
		}
		_catalogCheckGeneration += 1;
		mutate.UIControls.manage_AIs.catalog_update( ( catalogUpdate ) => {
			catalogUpdate.preview = null;
			catalogUpdate.checking = false;
		} );
		void discardAiCatalogUpdateService().catch( error => {
			console.error( '[SettingsView] discard catalog pending failed:' , error );
		} );
	}

	async function exitWithoutSave() {
		dismissCatalogUpdate();
		try {
			await reloadRuntimeSettings();
		} catch ( error ) {
			console.error( '[SettingsView] Failed to discard changes on exit:' , error );
		}
		exitSettings();
	}

	async function applySettings() {
		setState.submit_settings_status( {
			pending : true ,
			error : false,
		} );
		try {
			const result = await applySettingsService( buildSettingsFromStore() );
			if( result.success ) {
				if( result.settings ) {
					applyRuntimeSettingsToStore( result.settings );
				} else {
					await reloadRuntimeSettings();
				}
			}
			setState.submit_settings_status( {
				pending : false ,
				error : !result.success,
			} );
			return result;
		} catch ( error ) {
			console.error( '[SettingsView] Failed to apply settings:' , error );
			setState.submit_settings_status( {
				pending : false ,
				error : true,
			} );
			throw error;
		}
	}

	async function applyAIs() {
		setState.submit_settings_status( {
			pending : true ,
			error : false,
		} );
		try {
			const nextAIs = buildSettingsFromStore().AIs;
			const result = await applyAIsService( cloneForIPC( nextAIs ) );
			if( result.success ) {
				applyAIsToStore( nextAIs );
			}
			setState.submit_settings_status( {
				pending : false ,
				error : !result.success,
			} );
			return result;
		} catch ( error ) {
			console.error( '[SettingsView] Failed to apply AI pages:' , error );
			setState.submit_settings_status( {
				pending : false ,
				error : true,
			} );
			throw error;
		}
	}

	/**
	 * 弹窗 Save 成功后只把这一条并进 committed，其它行的 Enabled/待删除草稿仍 dirty。
	 * 不覆盖本地未提交的 disabled。见 docs/features/manage-ais-save-scopes.md
	 */
	function commitOneAIAfterPersist( persisted:AI.AIItem ) {
		mutate.Data( state => {
			const index = state.AIs.findIndex( ai => ai.id === persisted.id );
			if( index === -1 ) {
				state.AIs = [ ...state.AIs , persisted ];
				return;
			}
			state.AIs = state.AIs.map( ( ai , i ) => i === index
				? { ...persisted , disabled : ai.disabled }
				: ai );
		} );
		const live = store.Data.AIs.find( ai => ai.id === persisted.id );
		if( !live ) {
			return;
		}
		const isNew = !_committedAIIds.has( live.id );
		_committedAIIds.add( live.id );
		if( isNew ) {
			_committedDisabledById.set( live.id , Boolean( persisted.disabled ) );
		}
		const committedDisabled = _committedDisabledById.get( live.id ) === true;
		_committedAISnapshot.set( live.id , JSON.stringify( {
			...live ,
			disabled : committedDisabled,
		} ) );
		_lastSavedAIsSnapshot = fingerprintCommittedAIsForDirty(
			store.Data.AIs ,
			_committedAIIds ,
			_committedAISnapshot,
		);
	}

	async function persistAIFromModal( nextAI:AI.AIItem , mode:'edit' | 'add' ):Promise<{ success:boolean; error?:string }> {
		try {
			if( mode === 'add' ) {
				const created = await addAI( cloneForIPC( nextAI ) );
				if( !created ) {
					return { success : false , error : 'Failed to add AI page' };
				}
				commitOneAIAfterPersist( created );
				return { success : true };
			}
			const { disabled : _disabled , id , ...updates } = nextAI;
			const updated = await updateAI( id , cloneForIPC( updates ) );
			if( !updated ) {
				return { success : false , error : 'Failed to update AI page' };
			}
			commitOneAIAfterPersist( updated );
			return { success : true };
		} catch ( error ) {
			console.error( '[SettingsView] Failed to persist AI from modal:' , error );
			return {
				success : false ,
				error : error instanceof Error ? error.message : String( error ),
			};
		}
	}
	
	const changeEditAIModalVisible = (visible:boolean , AI_id?:string) => {
		const targetFields = AI_id
			? store.Data.AIs.find( item => item.id === AI_id )
			: null;
		setState.UIControls.manage_AIs.edit_AI_modal( {
			visible ,
			mode : AI_id ? 'edit' : 'add' ,
			editing_id : AI_id || null ,
			fields : targetFields
				? checkAs<AI.EditAIItem>( cloneForIPC( targetFields ) )
				: defaultAIFields(),
		} );
	};

	const changeCloneAIModalVisible = (AI_id:string) => {
		const targetFields = store.Data.AIs.find( item => item.id === AI_id );
		if( !targetFields ) return;
		setState.UIControls.manage_AIs.edit_AI_modal( {
			visible : true ,
			mode : 'add' ,
			editing_id : null ,
			fields : checkAs<AI.EditAIItem>( cloneForIPC( {
				label : targetFields.label ,
				AI_family : targetFields.AI_family ,
				url : targetFields.url ,
				url_override : targetFields.url_override ,
				desc : targetFields.desc ,
				preloadOnStartup : targetFields.preloadOnStartup ,
				proxy_mode : targetFields.proxy_mode ,
				from_server_list_proxy : targetFields.from_server_list_proxy ,
				user_fill_proxy : targetFields.user_fill_proxy,
			} ) ),
		} );
	};
	
	/** 只翻转 disabled，不改 `AIs` 下标。展示置底等表底 Save 更新 committed 快照后再做。见 docs/features/manage-ais-table-ux.md */
	const setAIEnabled = (id:string , enabled:boolean) => {
		mutate.Data( state => {
			state.AIs = state.AIs.map( ai => ai.id === id
				? {
					...ai ,
					disabled : !enabled,
				}
				: ai );
		} );
	};

	const createDefaultAIName = (family:AI.AIFamily , excludeId?:string | null) => {
		return buildDefaultAIName( family , store.Data.AIs , excludeId );
	};

	const setStartupAIPageLoadMode = (aiPageLoadMode:Startup.AIPageLoadMode) => {
		setState.UIControls.manage_AIs( { startupAIPageLoadMode : aiPageLoadMode } );
	};

/** Switch AI menubar 拖完后同步表格；只改顺序，保留未提交的 toggle / 待删除。 */
	const applyExternalEnabledAIOrder = ( enabledIds:string[] ) => {
		const current = store.Data.AIs;
		const next = applyEnabledAIOrder( current , enabledIds );
		if( enabledAIIdsEqual( current.map( ai => ai.id ) , next.map( ai => ai.id ) ) ) {
			return;
		}
		mutate.Data( state => {
			state.AIs = next;
		} );
	};

	const persistCommittedAIOrder = ( previousAIs:AI.AIItem[] ) => {
		const generation = ++_aiOrderPersistGeneration;
		_aiOrderPersistQueue = _aiOrderPersistQueue
			.catch( () => null )
			.then( async() => {
				if( generation !== _aiOrderPersistGeneration ) {
					return { success : true };
				}
				/* 未提交新建项不能进 reorder-ais；待删除仍已提交，必须带着走。
				 * 弹窗 Add 已即时 persist，一般都会在 committed 里。
				 * 此处按 store.Data.AIs（真实序，不是表内启用置顶的展示序）取已提交 id。
				 * 表内拖拽已在 mutate 时按启用槽位写回。见 docs/features/ai-list-reorder.md 、docs/features/manage-ais-table-ux.md */
				const orderedIds = committedAIIdsInVisualOrder( store.Data.AIs , _committedAIIds );
				if( orderedIds.length === 0 ) {
					return { success : true };
				}
				const result = await reorderAIs( cloneForIPC( orderedIds ) );
				if( !result?.success ) {
					throw new Error( result?.error || 'Failed to reorder AI pages' );
				}
				return result;
			} )
			.catch( error => {
				if( generation === _aiOrderPersistGeneration ) {
					mutate.Data( state => {
						state.AIs = previousAIs;
					} );
				}
				throw error;
			} );
		return _aiOrderPersistQueue;
	};

	const setProxyTestURL = async( target:NetworkProxy.ProxyTestTarget , url:string ) => {
		const nextProxyTestURLs:NetworkProxy.ProxyTestURLs = {
			...store.UIControls.networks.proxy_test_urls ,
			[target] : url,
		};
		setState.UIControls.networks( {
			proxy_test_urls : nextProxyTestURLs,
		} );
		_proxyTestURLSubmitQueue = _proxyTestURLSubmitQueue
			.catch( () => null )
			.then( async() => {
				const payload = cloneForIPC( nextProxyTestURLs );
				const result = await submitSettings( '/networks/proxy_test_urls' , payload );
				if( !result.success ) {
					throw new Error( result.error || 'Failed to save proxy test URLs' );
				}
				return result;
			} );
		return _proxyTestURLSubmitQueue;
	};

	const clearCatalogChecking = () => {
		mutate.UIControls.manage_AIs.catalog_update( ( catalogUpdate ) => {
			catalogUpdate.checking = false;
		} );
	};

	const clearCatalogApplying = () => {
		mutate.UIControls.manage_AIs.catalog_update( ( catalogUpdate ) => {
			catalogUpdate.applying = false;
		} );
	};

	/**
	 * Settings → Manage AIs 检查供应商目录。Settings 或 AI 表任一 dirty 会挡住。
	 * in-flight 以 catalog_update.checking / applying 为唯一真相：busy 时同步 return，不发第二次 IPC。
	 * 预览放 catalog_update.preview，不写 Data.AIs。
	 * checking 必须在 finally 清掉；IPC 若挂住，UI watchdog 到期也要解锁按钮。
	 */
	const checkAiCatalog = async():Promise<
		| { blocked: 'dirty' }
		| { blocked: 'in-flight' }
		| AICatalog.CatalogUpdateCheckResult
	> => {
		if( isCatalogUpdateInFlight( store.UIControls.manage_AIs.catalog_update ) ) {
			return { blocked : 'in-flight' };
		}
		if( hasBlockingUnsavedChanges() ) {
			return { blocked : 'dirty' };
		}
		const generation = ++_catalogCheckGeneration;
		// 同步写入，同帧后续点击能读到 busy（check 与 apply 互斥）
		mutate.UIControls.manage_AIs.catalog_update( ( catalogUpdate ) => {
			catalogUpdate.checking = true;
		} );
		try {
			const result = await rejectWhenTimedOut(
				checkAiCatalogUpdateService() ,
				CATALOG_UPDATE_UI_WATCHDOG_MS ,
				'catalog check UI watchdog',
			);
			if( generation !== _catalogCheckGeneration ) {
				return result;
			}
			if( result.status === 'available' ) {
				if( hasBlockingUnsavedChanges() ) {
					setState.UIControls.manage_AIs.catalog_update( { preview : null } );
					void discardAiCatalogUpdateService().catch( error => {
						console.error( '[SettingsView] discard catalog pending after dirty check:' , error );
					} );
					return { blocked : 'dirty' };
				}
				setState.UIControls.manage_AIs.catalog_update( {
					preview : result,
				} );
			} else if( result.status === 'up-to-date' ) {
				setState.UIControls.manage_AIs.catalog_update( {
					preview : null,
				} );
			}
			return result;
		} finally {
			if( generation === _catalogCheckGeneration ) {
				clearCatalogChecking();
			}
		}
	};

	/**
	 * 确认合并这次 check 的 revision。成功后只 reload AIs，不动 runtime 草稿。
	 * busy 时同步 return，避免连点第二次走到 main 的 no-pending 盖住第一次的成功 toast。
	 * applying 必须在 finally 清掉，避免 Modal confirmLoading 卡死。
	 */
	const applyAiCatalog = async():Promise<
		| { blocked: 'dirty' }
		| { blocked: 'in-flight' }
		| AICatalog.CatalogUpdateApplyResult
	> => {
		if( isCatalogUpdateInFlight( store.UIControls.manage_AIs.catalog_update ) ) {
			return { blocked : 'in-flight' };
		}
		if( hasBlockingUnsavedChanges() ) {
			return { blocked : 'dirty' };
		}
		const revision = store.UIControls.manage_AIs.catalog_update.preview?.remoteRevision;
		if( revision == null ) {
			return {
				success : false ,
				errorCode : 'no-pending',
			};
		}
		const generation = ++_catalogApplyGeneration;
		// 同步写入，同帧后续点击能读到 busy（check 与 apply 互斥）
		mutate.UIControls.manage_AIs.catalog_update( ( catalogUpdate ) => {
			catalogUpdate.applying = true;
		} );
		try {
			const result = await rejectWhenTimedOut(
				applyAiCatalogUpdateService( revision ) ,
				CATALOG_UPDATE_UI_WATCHDOG_MS ,
				'catalog apply UI watchdog',
			);
			if( generation !== _catalogApplyGeneration ) {
				return result;
			}
			if( result.success ) {
				setState.UIControls.manage_AIs.catalog_update( {
					preview : null,
				} );
				if( result.restartRequired ) {
					return result;
				}
				try {
					await reloadAIs();
				} catch ( error ) {
					console.error( '[SettingsView] catalog applied but reload AIs failed:' , error );
				}
			}
			return result;
		} finally {
			if( generation === _catalogApplyGeneration ) {
				clearCatalogApplying();
			}
		}
	};

	const rtn = {
		fetchSettings ,
		reloadSettings ,
		reloadRuntimeSettings ,
		reloadAIs ,
		setSettings ,
		refreshAppearanceEnvironment ,
		setTheme ,
		setLanguage ,
		buildSettingsFromStore ,
		applySettings ,
		applyAIs ,
		persistAIFromModal ,
		isDirty ,
		isAIsDirty ,
		changeEditAIModalVisible ,
		changeCloneAIModalVisible ,
		setAIEnabled ,
		createDefaultAIName ,
		setStartupAIPageLoadMode ,
		applyExternalEnabledAIOrder ,
		persistCommittedAIOrder ,
		setProxyTestURL ,
		checkAiCatalog ,
		applyAiCatalog ,
		dismissCatalogUpdate ,
		submitSettings ,
		exitSettings ,
		exitWithoutSave ,
		turnToNextAiPage ,
		turnToPreviousAiPage ,
		/**
		 * 判断某个 AI 是否为新增未保存的
		 */
		isNewAI( id: string ): boolean {
			return !_committedAIIds.has( id );
		},
		/**
		 * 标记 AI 为待删除 — 仅在表底 Save 时真正移除并持久化
		 */
		markAIForDeletion( id: string ): void {
			const current = store.UIControls.manage_AIs.pendingDeleteAIIds;
			if( !current.includes( id ) ) {
				setState.UIControls.manage_AIs( { pendingDeleteAIIds : [ ...current , id ] } );
			}
		},
		/**
		 * 撤销待删除标记
		 */
		undoMarkAIForDeletion( id: string ): void {
			setState.UIControls.manage_AIs( {
				pendingDeleteAIIds : store.UIControls.manage_AIs.pendingDeleteAIIds.filter( i => i !== id ),
			} );
		},
		/**
		 * 判断 AI 是否处于待删除状态
		 */
		isAIPendingDeletion( id: string ): boolean {
			return store.UIControls.manage_AIs.pendingDeleteAIIds.includes( id );
		},
		/**
		 * 打开某一列筛选面板。点空白不关；多列可同时开。不 persist。
		 */
		openManageAIsColumnFilter( key : ManageAIsColumnFilterKey ): void {
			if( store.UIControls.manage_AIs.column_filter.open[key] ) {
				return;
			}
			setState.UIControls.manage_AIs.column_filter.open( { [key] : true } );
		},
		/**
		 * 输入即筛。只改 UIControls，不写 Data.AIs。
		 */
		setManageAIsColumnFilterValue( key : ManageAIsColumnFilterKey , value : string ): void {
			if( store.UIControls.manage_AIs.column_filter.value[key] === value ) {
				return;
			}
			setState.UIControls.manage_AIs.column_filter.value( { [key] : value } );
		},
		/**
		 * 面板右上 x：关这一列并清空该列条件。
		 */
		closeAndClearManageAIsColumnFilter( key : ManageAIsColumnFilterKey ): void {
			setState.UIControls.manage_AIs.column_filter.open( { [key] : false } );
			setState.UIControls.manage_AIs.column_filter.value( { [key] : '' } );
		},
		/**
		 * 上次表底 Save / 弹窗 persist 时该行是否未启用。不在快照里的新建行视为启用区，直到写入 committed。
		 * 表格置底 / 禁拖用这个，不要用当前 `ai.disabled`。见 docs/features/manage-ais-table-ux.md
		 */
		isCommittedDisabled( id: string ): boolean {
			return _committedDisabledById.get( id ) === true;
		},
		/**
		 * 判断某个 AI 是否已修改但未保存
		 */
		isModifiedAI( id: string ): boolean {
			if( !_committedAIIds.has( id ) ) return false;
			const current = store.Data.AIs.find( ai => ai.id === id );
			if( !current ) return false;
			return JSON.stringify( current ) !== _committedAISnapshot.get( id );
		},
		navigateFromMain( payload : AppUpdater.NavigatePayload ) {
			if( shouldLockSettingsChromeForCatalogUpdate( store.UIControls.manage_AIs.catalog_update ) ) {
				return;
			}
			/* `version` 为旧导航别名，统一落到 About */
			if( payload.menu !== 'about' && payload.menu !== 'version' ) return;
			setState.RootMenu( { current : checkAs<Menus>( 'about' ) } );
			setState.VersionUI( {
				activeTab : payload.versionTab === 'latest' ? 'latest' : 'current' ,
				drawerOpen : true ,
			} );
		},
	};
	
	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

function applyThemePreferenceToDocument(
	theme:Appearance.Theme = 'system' ,
	systemTheme:'light' | 'dark' = 'light',
) {
	const resolvedTheme = resolveThemePreference( theme , systemTheme );
	document.documentElement.dataset.chataioThemeSource = theme;
	document.documentElement.dataset.chataioTheme = resolvedTheme;
}

function previewPromptAppearance(appearance:PromptView.Appearance) {
	previewPromptViewAppearance( appearance );
}

function previewPromptAppearanceFromStore(appearance:Partial<PromptView.Appearance>) {
	previewPromptAppearance( {
		theme : appearance.theme || reaxel_SettingsView.store.UIControls.appearance.theme ,
		language : appearance.language || reaxel_SettingsView.store.UIControls.appearance.language,
	} );
}

function defaultAIFields():AI.EditAIItem {
	return {
		label : '' ,
		AI_family : checkAs<AI.AIFamily>( 'custom' ) ,
		url : '' ,
		url_override : null ,
		desc : '' ,
		preloadOnStartup : false ,
		proxy_mode : 'follow_global_setting' ,
		from_server_list_proxy : null ,
		user_fill_proxy : null,
	};
}

function getEnabledProxyServerId(
	proxyServerId:string | null | undefined ,
	proxyServerList:NetworkProxy.ProxyServer.Server[],
) {
	return proxyServerList.some( server => {
		return server.enabled !== false && server.proxy_server_id === proxyServerId;
	} )
		? proxyServerId
		: null;
}

const AINameSuffixPool = [
	'Anselm' ,
	'Leopold' ,
	'Florian' ,
	'Dietrich' ,
	'Ludwig' ,
	'Frieda' ,
	'Odette' ,
	'Colette' ,
	'Mireille' ,
	'Bastien' ,
	'Lucien' ,
	'Claudine' ,
	'Cosimo' ,
	'Ludovico' ,
	'Vittorio' ,
	'Marcello' ,
	'Fiorella' ,
	'Ginevra',
] as const;

/* family → 默认 AI 名称前缀 */
const AINameFamilyPrefix:Record<AI.AIFamily , string> = {
	chatgpt : 'ChatGPT' ,
	grok : 'Grok' ,
	gemini : 'Gemini' ,
	deepseek : 'DeepSeek' ,
	perplexity : 'Perplexity' ,
	claude : 'Claude' ,
	manus : 'Manus' ,
	aistudio : 'AI Studio' ,
	copilot : 'Copilot' ,
	'meta-ai' : 'Meta AI' ,
	poe : 'Poe' ,
	mistral : 'Mistral' ,
	doubao : 'Doubao' ,
	qianwen : 'Qianwen' ,
	kimi : 'Kimi' ,
	chatglm : 'ChatGLM' ,
	yuanbao : 'Yuanbao' ,
	hailuo : 'Hailuo' ,
	yiyan : 'Yiyan' ,
	custom : 'Custom AI' ,
	'dev-proxy-test' : 'Proxy Test' ,
};

function buildDefaultAIName(family:AI.AIFamily , AIs:AI.AIItem[] , excludeId?:string | null) {
	const prefix = AINameFamilyPrefix[family] || family;
	const normalizedExistingNames = AIs
		.filter( ai => ai.id !== excludeId )
		.map( ai => ai.label.trim().toLowerCase() )
		.filter( Boolean );
	const suffix = AINameSuffixPool.find( name => {
		const normalizedName = name.toLowerCase();
		return !normalizedExistingNames.some( existing => existing.includes( normalizedName ) );
	} );

	if( suffix ) {
		return `${ prefix }-${ suffix }`;
	}

	let index = 2;
	while( normalizedExistingNames.some( existing => existing.includes( `${ prefix }-${ index }`.toLowerCase() ) ) ) {
		index++;
	}
	return `${ prefix }-${ index }`;
}

export type Reaxel_SettingsView = Pick<typeof reaxel_SettingsView , "mutate"|"store"|"setState">;

import { rehancer_Dev } from './rehancer_Dev';
import { reaxel_I18n } from "#SettingsView/reaxels/i18n";
import {
	addAI ,
	applyAIs as applyAIsService ,
	applySettings as applySettingsService ,
	applyAiCatalogUpdate as applyAiCatalogUpdateService ,
	checkAiCatalogUpdate as checkAiCatalogUpdateService ,
	discardAiCatalogUpdate as discardAiCatalogUpdateService ,
	exitSettings ,
	fetchSettings as fetchSettingsService ,
	getAIs ,
	getAppearanceEnvironment ,
	previewPromptViewAppearance ,
	reorderAIs ,
	submitSettings ,
	turnToNextAiPage ,
	turnToPreviousAiPage ,
	updateAI,
} from '#SettingsView/services/Settings';
import {
	normalizeThemePreference ,
	resolveLanguagePreference ,
	resolveThemePreference,
} from '#shared/appearance';
import {
	isCatalogUpdateInFlight ,
	shouldLockSettingsChromeForCatalogUpdate,
} from '#shared/utils/catalog-update-inflight.utility';
import {
	CATALOG_UPDATE_UI_WATCHDOG_MS ,
	rejectWhenTimedOut,
} from '#shared/utils/catalog-update-timeout.utility';
import { cloneForIPC } from '#shared/utils/clone-for-ipc.utility';
import {
	createEmptyManageAIsColumnFilterOpen ,
	createEmptyManageAIsColumnFilters ,
	type ManageAIsColumnFilterKey,
} from '#shared/utils/manage-ais-table.utility';
import {
	applyEnabledAIOrder ,
	committedAIIdsInVisualOrder ,
	enabledAIIdsEqual,
} from '#shared/utils/merge-enabled-ai-order.utility';
import {
	fingerprintAIsDirtyState ,
	fingerprintCommittedAIsForDirty ,
	snapshotRuntimeSettingsForDirty,
} from '#shared/utils/settings-dirty-scopes.utility';
import {
	createDefaultGlobalProxy as defaultGlobalProxyFields ,
	createDefaultProxyConf as defaultProxyConf ,
	createDefaultProxyServers as defaultProxyServers,
	createDefaultProxyTestURLs as defaultProxyTestURLs,
} from '#shared/statics/default-proxy';
import type { Languages } from '#src/Types/Languages';
import type { PromptView } from '#src/Types/PromptView';
import type {
	Menus,
} from '#shared/structs/settings';
import type { AppUpdater } from '#src/Types/AppUpdater';
import type {
	Settings ,
	SettingsFetchResult,
} from '#src/Types/SettingsTypes';
import { AI } from "#src/Types/SettingsTypes/AI";
import type { AICatalog } from "#src/Types/AICatalog";
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
import type { Startup } from "#src/Types/SettingsTypes/Startup";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
