	const AIEnabledSwitch = reaxper( ( { id }:{ id:string } ) => {
		const target = reaxel_SettingsView.store.Data.AIs.find( ai => ai.id === id );
		const { setAIEnabled , isAIPendingDeletion } = reaxel_SettingsView();
		const isPendingDelete = isAIPendingDeletion( id );

		return <Switch
			checked={ target ? !target.disabled : false }
			disabled={ !target || isPendingDelete }
			onCheckedChange={ value => {
				setAIEnabled( id , value === true );
			} }
		/>;
	} );

	/**
	 * "Load this AI when app starts" 表格列勾选。
	 * 直接从表格行 toggle preloadOnStartup，无需进入 Edit Modal。
	 * 当 startupAIPageLoadMode 为 'first-ai' 且该 AI 为列表第一项时强制启用。
	 */
	const PreloadOnStartupCheckbox = reaxper( ( { id }:{ id:string } ) => {
		const target = reaxel_SettingsView.store.Data.AIs.find( ai => ai.id === id );
		const isFirstAI = reaxel_SettingsView.store.Data.AIs[0]?.id === id;
		const isFirstAIForcedPreload = reaxel_SettingsView.store.UIControls.manage_AIs.startupAIPageLoadMode === 'first-ai' && isFirstAI;
		const { isAIPendingDeletion } = reaxel_SettingsView();
		const isPendingDelete = isAIPendingDeletion( id );
		const checked = isFirstAIForcedPreload || ( target?.preloadOnStartup ?? false );

		return <Checkbox
			checked={ checked }
			disabled={ isFirstAIForcedPreload || !target || isPendingDelete }
			onCheckedChange={ value => {
				reaxel_SettingsView.mutate.Data( state => {
					state.AIs = state.AIs.map( ai => ai.id === id
						? { ...ai , preloadOnStartup : value === true }
						: ai );
				} );
			} }
		/>;
	} );

	/**
	 * 删除确认 Popover 组件 — 替代全局 Modal.confirm
	 * - 待删除状态：显示 [撤销删除] 按钮
	 * - 正常状态：显示 [删除] 按钮，点击弹出 Popover 二次确认
	 */
const DeleteAICell = reaxper( ( { record }:{ record:AI.AIItem } ) => {
	const { markAIForDeletion , undoMarkAIForDeletion , isAIPendingDeletion } = reaxel_SettingsView();
	const [ popoverOpen , setPopoverOpen ] = React.useState( false );
	const isPendingDelete = isAIPendingDeletion( record.id );

	if( isPendingDelete ) {
		return <Button
			variant="link"
			size="sm"
			onClick={ () => {
				undoMarkAIForDeletion( record.id );
			} }
		><I18n>Undo Delete</I18n></Button>;
	}

	return <Popover
		open={ popoverOpen }
		onOpenChange={ setPopoverOpen }
	>
		<PopoverTrigger asChild>
			<Button
				variant="link"
				size="sm"
				className="text-destructive"
				onClick={ e => {
					e.stopPropagation();
					setPopoverOpen( true );
				} }
			><I18n>Delete</I18n></Button>
		</PopoverTrigger>
		<PopoverContent className="delete-ai-popover w-[220px] text-center">
			<p className="mb-2 text-[13px]"><I18n>Are you sure you want to delete this AI page?</I18n></p>
			<div className="flex justify-center gap-2">
				<Button
					size="sm"
					variant="outline"
					onClick={ () => setPopoverOpen( false ) }
				><I18n>Cancel</I18n></Button>
				<Button
					size="sm"
					variant="destructive"
					onClick={ () => {
						markAIForDeletion( record.id );
						setPopoverOpen( false );
					} }
				><I18n>Delete</I18n></Button>
			</div>
		</PopoverContent>
	</Popover>;
} );

	/* family 列原来是彩色 Tag 文本；现改为「供应商 logo + 显示名」（AIFamilyIdentity），厂商辨识统一靠 logo。见 ai-vendor-logo-identity.md */

	/**
	 * Manage AIs 表：展示按上次表底 Save 的启用态分区（启用在上、未启用置底）；筛选与展示序都不改真实 `AIs`。
	 * 表底 Save/Undo 只管 Enabled / Preload / 删除；弹窗 Save 当场写盘。见 docs/features/manage-ais-save-scopes.md
	 */
	export const RCManageAIsPanel = reaxper( () => {
		const {
			changeEditAIModalVisible ,
			persistCommittedAIOrder ,
			reloadAIs ,
			applyAIs ,
			setStartupAIPageLoadMode,
			isCommittedDisabled,
			isAIsDirty,
		} = reaxel_SettingsView();
		/* 显式读 pendingDeleteAIIds 供 MobX 依赖收集：rowClassName / 列 render 由 rc-table 在响应式
		 * 上下文外调用，标记/撤销删除的行样式要靠本面板重渲染（新 dataSource / rowClassName 引用）带动
		 * 表体刷新。禁止把它拼进 Table 的 key（e35835056 曾如此修「MobX 回调追踪断裂」）——key 变化
		 * 会整表 remount，滚动容器位置弹回顶部。见 docs/features/manage-ais-table-ux.md */
		const pendingDeleteAIIds = reaxel_SettingsView.store.UIControls.manage_AIs.pendingDeleteAIIds;
		void pendingDeleteAIIds;
		const catalogUpdate = reaxel_SettingsView.store.UIControls.manage_AIs.catalog_update;
		const catalogChromeLocked = shouldLockSettingsChromeForCatalogUpdate( catalogUpdate );
		const aisDirty = isAIsDirty();
		const aisSubmitPending = reaxel_SettingsView.store.submit_settings_status.pending;
		const [resetModalVisible , setResetModalVisible] = React.useState( false );
		const tableHostRef = React.useRef<HTMLDivElement>( null );
		const tableScrollY = useHostScrollY( tableHostRef );
		const sourceAIs = reaxel_SettingsView.store.Data.AIs;
		const columnFilterValue = reaxel_SettingsView.store.UIControls.manage_AIs.column_filter.value;
		const isVisuallyDisabled = ( ai:{ id:string } ) => isCommittedDisabled( ai.id );
		const displayedAIs = displayedManageAIs( sourceAIs , columnFilterValue , isVisuallyDisabled );
		const disabledDisplayedIdSet = React.useMemo( () => {
			return new Set( displayedAIs.filter( ai => isCommittedDisabled( ai.id ) ).map( ai => ai.id ) );
		} , [ displayedAIs , isCommittedDisabled ] );
		/* 量高在 useLayoutEffect 里 setState，会在 paint 前同步再渲一次。
		 * 若这里直接按 scrollY 挂 Table，重表会挤进同一次 flush，切页仍卡。
		 * 用 effect 把挂表推到首帧工具栏画完之后。见 docs/features/settings-menu-switch-perf.md */
		const [ tableReady , setTableReady ] = React.useState( false );
		const markedMountRef = React.useRef( false );
		if( !markedMountRef.current ) {
			markedMountRef.current = true;
			noteSettingsMenu( SettingsMenuPerfPhase.PanelMount , {
				aiCount : reaxel_SettingsView.store.Data.AIs.length ,
			} );
		}

		React.useLayoutEffect( () => {
			if( !settingsMenuTraceAwaitingPanel() ) {
				return;
			}
			noteSettingsMenu( SettingsMenuPerfPhase.PanelLayout , {
				scrollY : tableScrollY ?? null ,
				tableReady ,
			} );
			if( tableScrollY == null || !tableReady ) {
				return;
			}
			noteSettingsMenu( SettingsMenuPerfPhase.ScrollY , { scrollY : tableScrollY } );
			requestAnimationFrame( () => {
				requestAnimationFrame( () => {
					noteSettingsMenu( SettingsMenuPerfPhase.PanelPaint , { scrollY : tableScrollY } );
					endSettingsMenuTrace( { source : 'panel' } );
				} );
			} );
		} , [ tableScrollY , tableReady ] );

		React.useEffect( () => {
			if( tableScrollY == null || tableReady ) {
				return;
			}
			setTableReady( true );
		} , [ tableScrollY , tableReady ] );

		/* custom 页 favicon 表：一次拉取，供表格 / 弹窗里的 logo 兜底 */
		React.useEffect( () => {
			void reaxel_AIFavicons().ensureLoaded();
		} , [] );

		React.useEffect( () => {
			if( !settingsMenuTraceAwaitingPanel() ) {
				return;
			}
			const timer = window.setTimeout( () => {
				endSettingsMenuTrace( { source : 'timeout' } );
			} , 2000 );
			return () => {
				window.clearTimeout( timer );
			};
		} , [] );
		const sensors = useSensors(
			useSensor( PointerSensor , {
				activationConstraint : {
					distance : 1,
				},
			} ),
		);

		const collisionDetection : CollisionDetection = args => {
			return closestCenter( {
				...args ,
				droppableContainers : args.droppableContainers.filter( container => {
					return !disabledDisplayedIdSet.has( String( container.id ) );
				} ) ,
			} );
		};

		/* 只重排启用槽，未启用钉在真实下标。失败由 persistCommittedAIOrder 回滚。槽位按已保存的 disabled 算。 */
		const onDragEnd = ( { active , over }:DragEndEvent ) => {
			if( !over || active.id === over.id ) {
				return;
			}
			const previousAIs = reaxel_SettingsView.store.Data.AIs.slice();
			const nextAIs = reorderEnabledAIsByVisualDrag(
				previousAIs ,
				displayedAIs ,
				String( active.id ) ,
				String( over.id ) ,
				isVisuallyDisabled ,
			);
			if( !nextAIs || enabledAIIdsEqual(
				previousAIs.map( ai => ai.id ) ,
				nextAIs.map( ai => ai.id ) ,
			) ) {
				return;
			}
			reaxel_SettingsView.mutate.Data( state => {
				state.AIs = nextAIs;
			} );
			void persistCommittedAIOrder( previousAIs ).catch( error => {
				console.error( '[ManageAIs] Reorder failed:' , error );
				toast.error( i18n( 'Failed to reorder AI pages' ) );
			} );
		};

		const handleResetConfirmed = async() => {
			try {
				const result = await resetAIsToDefaults();
				if( !result.success ) {
					toast.error( result.error || i18n( 'Failed to reset AI pages' ) );
					return;
				}
				await reloadAIs();
				setResetModalVisible( false );
				toast.success( i18n( 'AI pages reset to defaults' ) );
			} catch ( err ) {
				console.error( '[ManageAIs] Reset failed:' , err );
				toast.error( i18n( 'Failed to reset AI pages' ) );
			}
		};

		return <div className="settings-section settings-section--fill">
			<div className="section-title"><I18n>Manage AIs</I18n></div>
			<div className="settings-section__toolbar">
				<div className="mb-4">
					<div className="mb-2 text-sm font-medium"><I18n>Startup AI Page</I18n></div>
					<RadioGroup
						value={ reaxel_SettingsView.store.UIControls.manage_AIs.startupAIPageLoadMode }
						className="gap-1"
						onValueChange={ value => {
							setStartupAIPageLoadMode( value as Startup.AIPageLoadMode );
						} }
					>
						<RadioRow
							value="last-used-ai"
							className="data-testid-startup-ai-page-last-used"
						>
							<span data-testid="startup-ai-page-last-used">
								<I18n>Load the AI page used last time before exit</I18n>
							</span>
						</RadioRow>
						<RadioRow value="first-ai">
							<span data-testid="startup-ai-page-first">
								<I18n>Always load the first AI page when app starts</I18n>
							</span>
						</RadioRow>
					</RadioGroup>
				</div>
				<Button
					variant="outline"
					onClick={ () => {
						changeEditAIModalVisible( true );
					} }
					className="mb-4"
				><I18n>Add AI Page</I18n></Button>
				<CatalogUpdateControls />
			</div>
			<DndContext
				sensors={ sensors }
				collisionDetection={ collisionDetection }
				modifiers={ [ restrictToVerticalAxis ] }
				onDragEnd={ onDragEnd }
			>
				<SortableContext
					items={ displayedAIs.map( ai => ai.id ) }
					strategy={ verticalListSortingStrategy }
				>
					<div
						className="settings-table-host"
						ref={ tableHostRef }
					>
						{ /* 先画出工具栏，下一帧再挂表，避免长任务挡住切页。空表仍挂表头，筛选 portal 不进单元格。 */ }
						{ tableReady && tableScrollY != null ? <>
							<div
								className={ displayedAIs.length === 0 ? 'manage-ais-table manage-ais-table--empty' : 'manage-ais-table' }
								style={ { width : '100%' , maxHeight : tableScrollY + 40 , overflow : 'auto' } }
							>
								<table
									className="w-full caption-bottom text-sm"
									style={ { tableLayout : 'fixed' , minWidth : 600 } }
								>
									<thead>
										<tr>
											<th className="manage-ais-table__th-compact w-12 text-center"><span className="manage-ais-table__header-nowrap"><I18n>Drag</I18n></span></th>
											<th className="manage-ais-table__th-compact w-[68px] text-center"><span className="manage-ais-table__header-nowrap"><I18n>Enabled</I18n></span></th>
											<th className="manage-ais-table__th-compact w-[108px] text-center leading-tight">
												<span className="inline-block max-w-full whitespace-normal"><I18n>Preload on Startup</I18n></span>
											</th>
											<th>
												<span className="inline-flex items-center gap-1">
													<I18n>AI name</I18n>
													<ColumnTextFilterIcon filterKey="label" />
												</span>
											</th>
											<th>
												<span className="inline-flex items-center gap-1">
													<I18n>AI family</I18n>
													<ColumnTextFilterIcon filterKey="AI_family" />
												</span>
											</th>
											<th>
												<span className="inline-flex items-center gap-1">
													<I18n>AI URL</I18n>
													<ColumnTextFilterIcon filterKey="url" />
												</span>
											</th>
											<th className="w-40"><I18n>Operations</I18n></th>
										</tr>
									</thead>
									<tbody>
										{ displayedAIs.map( record => {
											const { isNewAI , isModifiedAI , isAIPendingDeletion , changeEditAIModalVisible , changeCloneAIModalVisible } = reaxel_SettingsView();
											const isPendingDelete = isAIPendingDeletion( record.id );
											const rowClass = isPendingDelete
												? 'ai-row--pending-delete'
												: isNewAI( record.id )
													? 'ai-row--new'
													: isModifiedAI( record.id )
														? 'ai-row--modified'
														: '';
											return <SortableRow
												key={ record.id }
												rowId={ record.id }
												className={ rowClass }
											>
												<td className="text-center"><DragHandle/></td>
												<td className="text-center"><AIEnabledSwitch id={ record.id }/></td>
												<td className="text-center"><PreloadOnStartupCheckbox id={ record.id }/></td>
												<td>
													<span className="inline-flex max-w-full items-center gap-1.5">
														<AIIdentity ai={ record }/>
														{ isNewAI( record.id ) ? <Badge variant="success"><I18n>New</I18n></Badge> : null }
														{ isModifiedAI( record.id ) ? <Badge variant="warning"><I18n>Modified</I18n></Badge> : null }
													</span>
												</td>
												<td><AIFamilyIdentity family={ record.AI_family } muted/></td>
												<td className="truncate">{ record.url }</td>
												<td>
													<div className="flex items-center gap-1">
														{ !isPendingDelete && <>
															<Button
																variant="link"
																size="sm"
																onClick={ () => {
																	changeEditAIModalVisible( true , record.id );
																} }
															><I18n>Edit</I18n></Button>
															<Button
																variant="link"
																size="sm"
																onClick={ () => {
																	changeCloneAIModalVisible( record.id );
																} }
															><I18n>Clone</I18n></Button>
														</> }
														<DeleteAICell record={ record } />
													</div>
												</td>
											</SortableRow>;
										} ) }
									</tbody>
								</table>
							</div>
							<ManageAIsColumnFilterOverlays />
						</> : null }
					</div>
				</SortableContext>
			</DndContext>
			<div className="settings-section__footer" style={ { marginTop : 16 , display : 'flex' , justifyContent : 'flex-end' , gap : 8 , alignItems : 'center' } }>
				{ /* antd loading 会拿掉 accessible name；E2E 用 testid。见 docs/features/e2e-playwright.md */ }
				<Button
					variant="outline"
					data-testid="manage-ais-undo"
					disabled={ !aisDirty || catalogChromeLocked || aisSubmitPending }
					onClick={ async() => {
						try {
							await reloadAIs();
						} catch ( error ) {
							console.error( '[ManageAIs] Undo AI changes failed:' , error );
							toast.error( i18n( 'Failed to apply AI pages' ) );
						}
					} }
				><I18n>Undo Changes</I18n></Button>
				<Button
					data-testid="manage-ais-save"
					disabled={ !aisDirty || catalogChromeLocked || aisSubmitPending }
					loading={ aisSubmitPending }
					onClick={ async() => {
						try {
							const result = await applyAIs();
							if( !result.success ) {
								toast.error( result.error || i18n( 'Failed to apply AI pages' ) );
								return;
							}
							toast.success( i18n( 'AI pages applied' ) );
						} catch ( error ) {
							console.error( '[ManageAIs] Apply AIs failed:' , error );
							toast.error( i18n( 'Failed to apply AI pages' ) );
						}
					} }
				><I18n>Save</I18n></Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							disabled={ catalogChromeLocked }
						><I18n>Advanced</I18n></Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem
							className="text-destructive"
							onClick={ () => setResetModalVisible( true ) }
						><I18n>Reset All AI Pages</I18n></DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<ResetConfirmModal
				visible={ resetModalVisible }
				onCancel={ () => setResetModalVisible( false ) }
				onConfirm={ handleResetConfirmed }
			/>
			<EditAIModal/>
		</div>;
	} );

	/**
	 * 拖拽监听器上下文 - 仅传递给DragHandle单元格
	 */
	const DragHandleContext = React.createContext<{
		listeners?: ReturnType<typeof useSortable>['listeners'];
		attributes?: ReturnType<typeof useSortable>['attributes'];
			disabled?: boolean;
	}>( {} );

	const DragHandle:React.FC = () => {
		const { listeners , attributes , disabled } = React.useContext( DragHandleContext );
		/* E2E 点这一格做左键拖；dnd-kit 不吃 HTML5 dragTo。见 docs/features/e2e-playwright.md */
		return <span
			data-testid="manage-ais-drag-handle"
			style={ { display : 'inline-flex' , alignItems : 'center' , cursor : disabled ? 'not-allowed' : 'move' , opacity : disabled ? 0.4 : 1 } }
			{ ...( disabled ? {} : attributes ) }
			{ ...( disabled ? {} : listeners ) }
		>
			<DragIconSvg
				style={ { fontSize : 24 , userSelect : 'none' , cursor : 'move' , color : '#bfbfbf' } }
			/>
		</span>;
	};

	const SortableRow:React.FC<{
		rowId: string;
		className?: string;
		children: React.ReactNode;
	}> = reaxper( props => {
		if( !props.rowId ) {
			return <tr>{ props.children }</tr>;
		}
		return <SortableDataRow { ...props } />;
	} );

	const SortableDataRow:React.FC<{
		rowId: string;
		className?: string;
		children: React.ReactNode;
	}> = reaxper( props => {
		const rowId = props.rowId;
		const { isAIPendingDeletion , isCommittedDisabled } = reaxel_SettingsView();
		const isPendingDelete = isAIPendingDeletion( rowId );
		const isDisabledAI = isCommittedDisabled( rowId );
		const {
			attributes ,
			listeners ,
			setNodeRef ,
			transform ,
			transition ,
			isDragging,
		} = useSortable( {
			id : rowId ,
			/* 未启用行禁拖也禁投放，避免拖进未启用区把它们挤走。置底分区看上次 Save 的 disabled。见 docs/features/manage-ais-table-ux.md */
			disabled : isDisabledAI ,
		} );

		const style:React.CSSProperties = {
			transform : CSS.Translate.toString( transform ) ,
			transition ,
			...( isDragging ? { position : 'relative' , zIndex : 9999 } : {} ),
		};

		const dragContext = ( isPendingDelete || isDisabledAI )
			? { disabled : true }
			: { listeners , attributes };

	return <DragHandleContext.Provider value={ dragContext }>
			<tr
				data-row-key={ rowId }
				className={ props.className }
				ref={ setNodeRef }
				style={ style }
			>
				{ props.children }
			</tr>
		</DragHandleContext.Provider>;
	} );

	const EditAIModal = reaxper( () => {
		const { edit_AI_modal:store } = reaxel_SettingsView.store.UIControls.manage_AIs;
		const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
		const {
			changeEditAIModalVisible ,
			createDefaultAIName,
			persistAIFromModal,
		} = reaxel_SettingsView();

		const fields = store.fields;
		const ProxyComponent = {
			from_server_list : <SelectProxyServer/> ,
			user_fill : <UserFillProxy/>,
		}[fields.proxy_mode] ?? null;

		const [urlEditing , setUrlEditing] = React.useState( false );
		const [urlDraft , setUrlDraft] = React.useState( '' );
		const [catalogDefaults , setCatalogDefaults] = React.useState<AI.AIItem[]>( [] );
		const [saving , setSaving] = React.useState( false );

		// 当modal开始打开时重置编辑状态，并拉取 catalog 默认 URL（已有 IPC，不进 store）
		React.useEffect( () => {
			if( store.visible ) {
				setUrlEditing( false );
				setUrlDraft( '' );
				~async function() {
					try {
						const defaults = await getDefaultAIs();
						setCatalogDefaults( Array.isArray( defaults ) ? defaults : [] );
					} catch ( error ) {
						console.error( '[ManageAIs] Failed to load catalog defaults:' , error );
					}
				}();
			}
		} , [store.visible] );

		const isCustomFamily = fields.AI_family === 'custom';
		const familyDefaultUrl = getFamilyDefaultUrl( fields.AI_family , catalogDefaults );
		// 内置 family 的 URL 可选择覆盖; custom family 的 URL 直接属于当前 AI 实例.
		const displayUrl = isCustomFamily ? fields.url : fields.url_override || familyDefaultUrl;
		const isFirstAIForcedPreload = reaxel_SettingsView.store.UIControls.manage_AIs.startupAIPageLoadMode === 'first-ai'
			&& store.mode === 'edit'
			&& reaxel_SettingsView.store.Data.AIs[0]?.id === store.editing_id;

		/** URL 处于行内编辑态时，把草稿按 suffix Save 的规则写回 url_override（与默认相同则清空）。 */
		const commitUrlDraftIfEditing = () => {
			if( isCustomFamily || !urlEditing ) {
				return;
			}
			const trimmed = urlDraft.trim();
			const defaultUrl = getFamilyDefaultUrl( fields.AI_family , catalogDefaults );
			setState.fields( {
				url_override : trimmed && trimmed !== defaultUrl ? trimmed : null,
			} );
			setUrlEditing( false );
		};

		const handleSave = async() => {
			/* 弹窗 Save 当场 update-ai / add-ai，不进表底 dirty。见 docs/features/manage-ais-save-scopes.md */
			/* Enter 触发保存前可能刚 commit 过 URL 草稿，这里从 store 取最新 fields，别用渲染闭包里的旧引用。 */
			const fields = store.fields;
			/*
			 * label 是用户自己的名字（厂商靠 logo 辨识），落盘必填。
			 * Edit 清空必须拦（空名会让多页同 family 无法区分）；Add / Clone 空着保存则写入 placeholder 那个默认名。
			 * 见 docs/features/ai-vendor-logo-identity.md
			 */
			const trimmedLabel = ( fields.label || '' ).trim();
			const effectiveLabel = trimmedLabel
				|| ( store.mode === 'edit' ? '' : createDefaultAIName( fields.AI_family ) );
			if( !effectiveLabel ) {
				toast.error( i18n( 'AI name is required' ) );
				return;
			}
			const effectiveUrl = ( isCustomFamily ? fields.url : fields.url_override || familyDefaultUrl ).trim();
			if( !effectiveUrl ) {
				toast.error( i18n( 'URL is required for custom AI' ) );
				return;
			}
			if( saving ) {
				return;
			}
			const nextAI:AI.AIItem = {
				id : store.editing_id || createAIId() ,
				label : effectiveLabel ,
				disabled : false ,
				AI_family : fields.AI_family ,
				url : effectiveUrl ,
				url_override : isCustomFamily ? null : fields.url_override ,
				desc : fields.desc ,
				preloadOnStartup : isFirstAIForcedPreload || fields.preloadOnStartup === true ,
				proxy_mode : fields.proxy_mode ,
				from_server_list_proxy : getEnabledProxyServerId( fields.from_server_list_proxy ) ,
				user_fill_proxy : fields.user_fill_proxy || null,
			};

			setSaving( true );
			try {
				const result = await persistAIFromModal( nextAI , store.mode );
				if( result.success === false ) {
					toast.error( result.error || i18n( 'Failed to save AI page' ) );
					return;
				}
				toast.success( i18n( 'AI page saved' ) );
				setState( {
					visible : false ,
					editing_id : null,
				} );
			} finally {
				setSaving( false );
			}
		};

		/**
		 * 任意文本输入框内按 Enter 即触发保存（表单不合法时 handleSave 自己报错拦下）。
		 * 排除 Select 搜索框（Enter 是选中选项）与 radio/checkbox；输入法合成中的 Enter 不算。
		 * URL 行内编辑态先按 suffix Save 规则提交草稿再保存，避免 Enter 把未提交的 URL 静默丢掉。
		 */
		const handleFormKeyDown = ( event:React.KeyboardEvent<HTMLFormElement> ) => {
			if( event.key !== 'Enter' || event.nativeEvent.isComposing || saving ) {
				return;
			}
			const target = event.target as HTMLElement;
			if( !( target instanceof HTMLInputElement ) ) {
				return;
			}
			if( target.type === 'radio' || target.type === 'checkbox' || target.closest( '[role="combobox"]' ) ) {
				return;
			}
			event.preventDefault();
			commitUrlDraftIfEditing();
			void handleSave();
		};

		// URL尾部按钮组
		const urlSuffix = isCustomFamily
			? null
			: urlEditing
			? <div className="flex gap-1">
				<Button
					variant="link"
					size="sm"
					onClick={ () => {
						commitUrlDraftIfEditing();
					} }
				>Save</Button>
				<Button
					variant="link"
					size="sm"
					onClick={ () => {
						setUrlEditing( false );
						setUrlDraft( '' );
					} }
				>Cancel</Button>
			</div>
			: <div className="flex gap-1">
				<Button
					variant="link"
					size="sm"
					onClick={ () => {
						setUrlDraft( displayUrl );
						setUrlEditing( true );
					} }
				>Edit</Button>
				{ fields.url_override ? <Button
					variant="link"
					size="sm"
					className="text-destructive"
					onClick={ () => {
						setState.fields( { url_override : null } );
					} }
				>Reset</Button> : null }
			</div>;

		return <Dialog
			open={ store.visible }
			onOpenChange={ ( open ) => {
				if( open === false ) {
					if( saving ) return;
					changeEditAIModalVisible( false );
				}
			} }
		>
			<DialogContent
				className="max-w-[520px]"
				onPointerDownOutside={ ( event ) => {
					if( saving ) event.preventDefault();
				} }
				onEscapeKeyDown={ ( event ) => {
					if( saving ) event.preventDefault();
				} }
			>
				<DialogHeader>
					<DialogTitle>{ store.mode === 'add' ? <I18n>Add AI Page</I18n> : <I18n>Edit AI Page</I18n> }</DialogTitle>
				</DialogHeader>
				<form
					className="space-y-4"
					onKeyDown={ handleFormKeyDown }
					onSubmit={ event => {
						event.preventDefault();
						void handleSave();
					} }
				>
					<div className="space-y-1.5">
						<div className="text-sm font-medium"><I18n>AI name</I18n></div>
						<p className="text-xs text-muted-foreground"><I18n>Your own name for this page; the provider is shown by its logo.</I18n></p>
						<div className="relative">
							<span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
								<AIVendorLogo
									family={ fields.AI_family }
									size={ 16 }
									faviconUrl={ store.editing_id ? reaxel_AIFavicons.store.byId[store.editing_id] ?? null : null }
									fallbackText={ isCustomFamily ? displayUrl : fields.label }
								/>
							</span>
							<Input
								className={ cn(
									'pl-8' ,
									store.mode === 'edit' && !( fields.label || '' ).trim() && 'border-destructive',
								) }
								value={ fields.label }
								placeholder={ store.mode === 'add' ? createDefaultAIName( fields.AI_family ) : undefined }
								onChange={ event => {
									setState.fields( { label : event.target.value } );
								} }
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<div className="text-sm font-medium"><I18n>AI family</I18n></div>
						<SimpleSelect
							value={ fields.AI_family }
							onValueChange={ value => {
								const family = value as AI.AIFamily;
								const defaultUrl = getFamilyDefaultUrl( family , catalogDefaults );
								setState.fields( {
									AI_family : family ,
									url : defaultUrl ,
									url_override : null,
								} );
								setUrlEditing( false );
							} }
							options={ familySelectOptions }
						/>
					</div>
					<div className="space-y-1.5">
						<div className="text-sm font-medium"><I18n>AI URL</I18n></div>
						<div className="flex items-center gap-2">
							<Input
								value={ urlEditing ? urlDraft : displayUrl }
								disabled={ !isCustomFamily && !urlEditing }
								onChange={ event => {
									if( isCustomFamily ) {
										setState.fields( {
											url : event.target.value ,
											url_override : null,
										} );
										return;
									}
									setUrlDraft( event.target.value );
								} }
							/>
							{ urlSuffix }
						</div>
					</div>
					<div className="space-y-1.5">
						<div className="text-sm font-medium"><I18n>Proxy</I18n></div>
						<RadioGroup
							value={ fields.proxy_mode }
							className="gap-1"
							onValueChange={ value => {
								const proxyMode = value as NetworkProxy.AIProxyMode;
								const patch:Partial<AI.EditAIItem> = { proxy_mode : proxyMode };
								if( proxyMode === 'user_fill' && !fields.user_fill_proxy ) {
									patch.user_fill_proxy = defaultProxyConf();
								}
								if( proxyMode === 'from_server_list' && !getEnabledProxyServerId( fields.from_server_list_proxy ) ) {
									patch.from_server_list_proxy = firstEnabledProxyServerId();
								}
								setState.fields( patch );
							} }
						>
							<RadioRow value="follow_global_setting"><I18n>Follow Global Setting</I18n></RadioRow>
							<RadioRow value="direct"><I18n>Direct</I18n></RadioRow>
							<RadioRow value="from_server_list"><I18n>Select From List</I18n></RadioRow>
							<RadioRow value="user_fill"><I18n>Manual</I18n></RadioRow>
						</RadioGroup>
						{ ProxyComponent }
					</div>
					<div className="flex items-center gap-2">
						<CheckboxField
							checked={ isFirstAIForcedPreload || ( fields.preloadOnStartup ?? false ) }
							disabled={ isFirstAIForcedPreload }
							onCheckedChange={ checked => {
								setState.fields( { preloadOnStartup : checked } );
							} }
						>
							<I18n>Load this AI immediately when app starts</I18n>
						</CheckboxField>
						{ isFirstAIForcedPreload ? <SimpleTooltip content={ <I18n>When [Always load the first AI page when app starts] is checked, this option is always selected</I18n> }>
							<Info className="h-3.5 w-3.5 text-muted-foreground" />
						</SimpleTooltip> : null }
					</div>
				</form>
				<DialogFooter>
					<Button
						variant="outline"
						disabled={ saving }
						onClick={ () => changeEditAIModalVisible( false ) }
					><I18n>Cancel</I18n></Button>
					<Button
						loading={ saving }
						onClick={ () => void handleSave() }
					><I18n>Save</I18n></Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>;
	} );

	export const SelectProxyServer = reaxper( () => {
		const { edit_AI_modal:store } = reaxel_SettingsView.store.UIControls.manage_AIs;
		const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
		const proxyServers = reaxel_SettingsView.store.UIControls.networks.proxy_server_list.filter( server => server.enabled !== false );
		const selectedProxyServerId = getEnabledProxyServerId( store.fields.from_server_list_proxy );

		return <SimpleSelect
			className="mt-3 w-full"
			value={ selectedProxyServerId || undefined }
			placeholder={ i18n( 'Select a proxy server' ) }
			onValueChange={ value => {
				setState.fields( {
					from_server_list_proxy : value || null,
				} );
			} }
			options={ proxyServers.map( server => ( {
				value : server.proxy_server_id ,
				label : `${ server.server_name } (${ server.proxy_conf.protocol }://${ server.proxy_conf.hostname }:${ server.proxy_conf.port })`,
			} ) ) }
		/>;
	} );

	export const UserFillProxy = reaxper( () => {
		const { edit_AI_modal:store } = reaxel_SettingsView.store.UIControls.manage_AIs;
		const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
		const userFillProxy = notFalse( store.fields.user_fill_proxy || defaultProxyConf() );

		return <div className="mt-3 space-y-3 rounded-md bg-muted/40 p-3">
			<div className="space-y-1.5">
				<div className="text-sm font-medium"><I18n>Protocol</I18n></div>
				<Segmented
					value={ userFillProxy.protocol }
					onChange={ ( value:NetworkProxy.Protocol ) => {
						setState.fields( {
							user_fill_proxy : {
								...userFillProxy ,
								protocol : value,
							},
						} );
					} }
					options={ [
						{ label : 'HTTP' , value : 'http' } ,
						{ label : 'HTTPS' , value : 'https' } ,
						{ label : 'Socks5' , value : 'socks5' },
					] }
				/>
			</div>
			<div className="space-y-1.5">
				<div className="text-sm font-medium"><I18n>Host name</I18n></div>
				<Input
					value={ userFillProxy.hostname }
					placeholder="127.0.0.1"
					onChange={ e => {
						setState.fields( {
							user_fill_proxy : {
								...userFillProxy ,
								hostname : e.target.value,
							},
						} );
					} }
				/>
			</div>
			<div className="space-y-1.5">
				<div className="text-sm font-medium"><I18n>Port number</I18n></div>
				<Input
					type="number"
					min={ 0 }
					max={ 65535 }
					value={ userFillProxy.port ?? '' }
					placeholder="7890"
					onChange={ e => {
						setState.fields( {
							user_fill_proxy : {
								...userFillProxy ,
								port : e.target.value === '' ? null : Number( e.target.value ),
							},
						} );
					} }
				/>
			</div>
			<CheckboxField
				checked={ !!userFillProxy.proxy_auth }
				onCheckedChange={ checked => {
					setState.fields( {
						user_fill_proxy : {
							...userFillProxy ,
							proxy_auth : checked
								? { username : '' , password : '' }
								: false,
						},
					} );
				} }
			><I18n>Authentication</I18n></CheckboxField>
			{ userFillProxy.proxy_auth ? <ProxyAuthFields proxyConf={ userFillProxy }/> : null }
		</div>;
	} );

	const ProxyAuthFields = reaxper( ( { proxyConf }:{ proxyConf:NetworkProxy.ProxyConfFields } ) => {
		const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
		const proxyAuth = notFalse( proxyConf.proxy_auth );

		return <>
			<div className="mt-3 space-y-1.5">
				<div className="text-sm font-medium"><I18n>Username</I18n></div>
				<Input
					value={ proxyAuth.username }
					onChange={ e => {
						setState.fields( {
							user_fill_proxy : {
								...proxyConf ,
								proxy_auth : {
									...proxyAuth ,
									username : e.target.value,
								},
							},
						} );
					} }
				/>
			</div>
			<div className="space-y-1.5">
				<div className="text-sm font-medium"><I18n>Password</I18n></div>
				<Input
					type="password"
					value={ proxyAuth.password }
					onChange={ e => {
						setState.fields( {
							user_fill_proxy : {
								...proxyConf ,
								proxy_auth : {
									...proxyAuth ,
									password : e.target.value,
								},
							},
						} );
					} }
				/>
			</div>
		</>;
	} );

	const firstEnabledProxyServerId = () => {
		return reaxel_SettingsView.store.UIControls.networks.proxy_server_list.find( server => {
			return server.enabled !== false;
		} )?.proxy_server_id || null;
	};

	const getEnabledProxyServerId = (proxyServerId:string | null | undefined) => {
		return reaxel_SettingsView.store.UIControls.networks.proxy_server_list.some( server => {
			return server.enabled !== false && server.proxy_server_id === proxyServerId;
		} )
			? proxyServerId
			: null;
	};

	const createAIId = () => {
		return globalThis.crypto?.randomUUID?.() || `ai-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 11 ) }`;
	};

	/**
	 * 长按确认按钮 - 环形进度条
	 * 用户必须持续按伭按钮直到进度条完成才会触发确认
	 */
	const LONG_PRESS_DURATION = 2000; // ms

	const LongPressConfirmButton:React.FC<{ onConfirm:() => void }> = ( { onConfirm } ) => {
		const [pressing , setPressing] = React.useState( false );
		const [progress , setProgress] = React.useState( 0 );
		const timerRef = React.useRef<number | null>( null );
		const startTimeRef = React.useRef<number>( 0 );

		const startPress = () => {
			setPressing( true );
			setProgress( 0 );
			startTimeRef.current = Date.now();

			const animate = () => {
				const elapsed = Date.now() - startTimeRef.current;
				const pct = Math.min( elapsed / LONG_PRESS_DURATION , 1 );
				setProgress( pct );

				if( pct >= 1 ) {
					setPressing( false );
					setProgress( 0 );
					onConfirm();
					return;
				}
				timerRef.current = requestAnimationFrame( animate );
			};
			timerRef.current = requestAnimationFrame( animate );
		};

		const endPress = () => {
			if( timerRef.current ) {
				cancelAnimationFrame( timerRef.current );
				timerRef.current = null;
			}
			setPressing( false );
			setProgress( 0 );
		};

		React.useEffect( () => {
			return () => {
				if( timerRef.current ) {
					cancelAnimationFrame( timerRef.current );
				}
			};
		} , [] );

		// SVG 环形进度条参数
		const size = 56;
		const strokeWidth = 4;
		const radius = ( size - strokeWidth ) / 2;
		const circumference = 2 * Math.PI * radius;
		const dashOffset = circumference * ( 1 - progress );

		return <div
			style={ {
				display : 'inline-flex' ,
				alignItems : 'center' ,
				justifyContent : 'center' ,
				position : 'relative' ,
				width : size ,
				height : size ,
				cursor : 'pointer' ,
				userSelect : 'none',
			} }
			onMouseDown={ startPress }
			onMouseUp={ endPress }
			onMouseLeave={ endPress }
			onTouchStart={ startPress }
			onTouchEnd={ endPress }
		>
			{/* 环形进度条 SVG */}
			<svg
				width={ size }
				height={ size }
				style={ { position : 'absolute' , top : 0 , left : 0 , transform : 'rotate(-90deg)' } }
			>
				{/* 背景圆环 */}
				<circle
					cx={ size / 2 }
					cy={ size / 2 }
					r={ radius }
					fill="none"
					stroke="#f0f0f0"
					strokeWidth={ strokeWidth }
				/>
				{/* 进度圆环 */}
				<circle
					cx={ size / 2 }
					cy={ size / 2 }
					r={ radius }
					fill="none"
					stroke="#ff4d4f"
					strokeWidth={ strokeWidth }
					strokeDasharray={ circumference }
					strokeDashoffset={ dashOffset }
					strokeLinecap="round"
					style={ { transition : pressing ? 'none' : 'stroke-dashoffset 0.2s ease' } }
				/>
			</svg>
			{/* 中心文字 */}
			<span style={ {
				fontSize : 11 ,
				fontWeight : 600 ,
				color : pressing ? '#ff4d4f' : '#595959' ,
				zIndex : 1,
			} }>Confirm</span>
		</div>;
	};

	/**
	 * 重置确认弹窗 - 包含警告和长按确认
	 */
	const ResetConfirmModal:React.FC<{
		visible:boolean;
		onCancel:() => void;
		onConfirm:() => void;
	}> = ( { visible , onCancel , onConfirm } ) => {
		return <Dialog
			open={ visible }
			onOpenChange={ ( open ) => {
				if( open === false ) onCancel();
			} }
		>
			<DialogContent className="max-w-[420px]">
				<DialogHeader>
					<DialogTitle className="text-destructive"><I18n>Reset All AI Pages</I18n></DialogTitle>
				</DialogHeader>
				<div className="py-3">
					<p className="mb-4 text-sm">
						<I18n>This will permanently reset all AI page configurations to factory defaults and clear page data including cookies, login state, localStorage, cache, and auth cache. All your custom AI pages, URL overrides, and proxy settings will be lost.</I18n>
					</p>
					<p className="mb-6 font-medium text-destructive">
						<I18n>Hold the button below to confirm reset.</I18n>
					</p>
					<div className="flex items-center justify-center gap-4">
						<LongPressConfirmButton onConfirm={ onConfirm }/>
						<Button
							variant="outline"
							onClick={ onCancel }
						><I18n>Cancel</I18n></Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>;
	};

	/**
	 * 加站 / 重置 URL：查 get-default-ais 映射后的默认实例里该 family 的官方 url（供应商目录行经 App 策略变成的种子页）。
	 * 否则当前 settings 同 family 且无 override、非 custom- id 的实例 url。
	 * 不把瘦目录放进 Settings store。见 docs/feature-proposal--ai-catalog-source.md（方向纠偏）。
	 */
	const getFamilyDefaultUrl = ( family:AI.AIFamily , catalogDefaults:AI.AIItem[] ):string => {
		if( family === 'custom' ) {
			return '';
		}
		const fromCatalog = catalogDefaults.find( ai => ai.AI_family === family );
		if( fromCatalog?.url ) {
			return fromCatalog.url;
		}
		const fromSettings = reaxel_SettingsView.store.Data.AIs.find( ai => {
			return ai.AI_family === family && !ai.url_override && !String( ai.id ).startsWith( 'custom-' );
		} );
		return fromSettings?.url || '';
	};

	/** 弹窗 family 下拉：logo + 显示名；搜索同时匹配 family key 与显示名 */
	const familySelectOptions = AIFamily.map( family => ( {
		value : family ,
		searchText : `${ family } ${ AIFamilyDisplayName[family] || '' }`.toLowerCase() ,
		label : <AIFamilyIdentity family={ family }/>,
	} ) );

	import { DragIconSvg } from "./DragIcon.svg";
	import { AIFamilyIdentity , AIIdentity } from '#SettingsView/components/AIIdentity';
	import { reaxel_AIFavicons } from '#SettingsView/reaxels/ai-favicons';
	import { AIVendorLogo } from '#shared/ai-vendor-logo';
	import { CatalogUpdateControls } from "./CatalogUpdate";
	import { ColumnTextFilterIcon , ManageAIsColumnFilterOverlays } from '#SettingsView/layout/column-text-filter';
	import { useHostScrollY } from '#SettingsView/layout/use-host-scroll-y';
	import {
		endSettingsMenuTrace ,
		noteSettingsMenu ,
		settingsMenuTraceAwaitingPanel ,
		SettingsMenuPerfPhase,
	} from '#SettingsView/layout/settings-menu-perf.utility';
	import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
	import { getDefaultAIs , resetAIsToDefaults } from "#SettingsView/services/Settings";
	import { AIFamily , AIFamilyDisplayName } from "#shared/statics/AI-family";
	import { createDefaultProxyConf as defaultProxyConf } from "#shared/statics/default-proxy";
	import { shouldLockSettingsChromeForCatalogUpdate } from '#shared/utils/catalog-update-inflight.utility';
	import {
		displayedManageAIs ,
		reorderEnabledAIsByVisualDrag ,
	} from '#shared/utils/manage-ais-table.utility';
	import { enabledAIIdsEqual } from '#shared/utils/merge-enabled-ai-order.utility';
	import { AI } from "#src/Types/SettingsTypes/AI";
	import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
	import type { Startup } from "#src/Types/SettingsTypes/Startup";
	import { Badge } from '#Views/shared/ui/badge';
	import { Button } from '#Views/shared/ui/button';
	import { Checkbox } from '#Views/shared/ui/checkbox';
	import { CheckboxField } from '#Views/shared/ui/checkbox-field';
	import { cn } from '#Views/shared/ui/cn.utility';
	import {
		Dialog ,
		DialogContent ,
		DialogFooter ,
		DialogHeader ,
		DialogTitle,
	} from '#Views/shared/ui/dialog';
	import {
		DropdownMenu ,
		DropdownMenuContent ,
		DropdownMenuItem ,
		DropdownMenuTrigger,
	} from '#Views/shared/ui/dropdown-menu';
	import { Input } from '#Views/shared/ui/input';
	import {
		Popover ,
		PopoverContent ,
		PopoverTrigger,
	} from '#Views/shared/ui/popover';
	import {
		RadioGroup ,
		RadioRow,
	} from '#Views/shared/ui/radio-group';
	import { Segmented } from '#Views/shared/ui/segmented';
	import { SimpleSelect } from '#Views/shared/ui/select';
	import { Switch } from '#Views/shared/ui/switch';
	import { toast } from '#Views/shared/ui/toast';
	import { SimpleTooltip } from '#Views/shared/ui/tooltip';
	import { Info } from 'lucide-react';
	import React from 'react';
	import { reaxper } from 'reaxes-react';
	import {
		closestCenter ,
		DndContext ,
		PointerSensor ,
		useSensor ,
		useSensors ,
	} from '@dnd-kit/core';
	import type { CollisionDetection , DragEndEvent } from '@dnd-kit/core';
	import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
	import {
		SortableContext ,
		useSortable ,
		verticalListSortingStrategy,
	} from '@dnd-kit/sortable';
	import { CSS } from '@dnd-kit/utilities';
