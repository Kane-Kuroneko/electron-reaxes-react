const AIEnabledCheckbox = reaxper( ( { id }:{ id:string } ) => {
	const target = reaxel_SettingsView.store.Data.AIs.find( ai => ai.id === id );
	const { setAIEnabled } = reaxel_SettingsView();

	return <Checkbox
		checked={ target ? !target.disabled : false }
		disabled={ !target }
		onChange={ e => {
			setAIEnabled( id , e.target.checked );
		} }
	/>;
} );

const columns:TableColumnType<AI.AIItem>[] = [
	{
		title : <I18n>Drag</I18n> ,
		width : 60 ,
		render() {
			return <DragHandle/>;
		},
	} ,
	{
		title : <I18n>Enabled</I18n> ,
		width : 80 ,
		render( _value , record ) {
			return <AIEnabledCheckbox id={ record.id }/>;
		},
	} ,
	{
		title : <I18n>AI name</I18n> ,
		dataIndex : 'label' ,
		render( _value , record ) {
			const { isNewAI , isModifiedAI } = reaxel_SettingsView();
			const isNew = isNewAI( record.id );
			const isModified = isModifiedAI( record.id );
			return <span style={ { display : 'inline-flex' , alignItems : 'center' , gap : 6 } }>
				{ record.label }
				{ isNew && <Tag color="green" style={ { marginLeft : 4 , fontSize : 11 , lineHeight : '18px' , padding : '0 5px' } }>
					<I18n>New</I18n>
				</Tag> }
				{ isModified && <Tag color="orange" style={ { marginLeft : 4 , fontSize : 11 , lineHeight : '18px' , padding : '0 5px' } }>
					<I18n>Modified</I18n>
				</Tag> }
			</span>;
		},
	} ,
	{
		title : <I18n>AI family</I18n> ,
		dataIndex : 'AI_family',
	} ,
	{
		title : <I18n>AI URL</I18n> ,
		dataIndex : 'url' ,
		ellipsis : true,
	} ,
	{
		title : <I18n>Operations</I18n> ,
		width : 220 ,
		render : ( _text , record ) => {
			const {
				changeEditAIModalVisible ,
				changeCloneAIModalVisible,
			} = reaxel_SettingsView();
			return <Space size={ 4 }>
				<Button
					type="link"
					size="small"
					onClick={ () => {
						changeEditAIModalVisible( true , record.id );
					} }
				><I18n>Edit</I18n></Button>
				<Button
					type="link"
					size="small"
					onClick={ () => {
						changeCloneAIModalVisible( record.id );
					} }
				><I18n>Clone</I18n></Button>
				<Button
					type="link"
					size="small"
					danger
					onClick={ () => {
						Modal.confirm( {
							title : <I18n>Delete AI page</I18n> ,
							content : `Delete ${ record.label } from Switch AI menu and settings.`,
							onOk() {
								reaxel_SettingsView.mutate.Data( state => {
									state.AIs = state.AIs.filter( ai => ai.id !== record.id );
								} );
							},
						} );
					} }
				><I18n>Delete</I18n></Button>
			</Space>;
		},
	},
];

export const RCManageAIsPanel = reaxper( () => {
	const {
		changeEditAIModalVisible ,
		reloadSettings ,
		setStartupAIPageLoadMode,
	} = reaxel_SettingsView();
	const [resetModalVisible , setResetModalVisible] = React.useState( false );
	const sensors = useSensors(
		useSensor( PointerSensor , {
			activationConstraint : {
				distance : 1,
			},
		} ),
	);
	
	const onDragEnd = ( { active , over }:DragEndEvent ) => {
		if( !over || active.id === over.id ) {
			return;
		}
		reaxel_SettingsView.mutate.Data( state => {
			const activeIndex = state.AIs.findIndex( ai => ai.id === active.id );
			const overIndex = state.AIs.findIndex( ai => ai.id === over.id );
			if( activeIndex === -1 || overIndex === -1 ) {
				return;
			}
			state.AIs = arrayMove( state.AIs.slice() , activeIndex , overIndex );
		} );
	};
	
	const handleResetConfirmed = async() => {
		try {
			const result = await resetAIsToDefaults();
			if( !result.success ) {
				message.error( result.error || i18n( 'Failed to reset AI pages' ) );
				return;
			}
			await reloadSettings();
			setResetModalVisible( false );
			message.success( i18n( 'AI pages reset to defaults' ) );
		} catch ( err ) {
			console.error( '[ManageAIs] Reset failed:' , err );
			message.error( i18n( 'Failed to reset AI pages' ) );
		}
	};
	
	return <div className="settings-section">
		<div className="section-title"><I18n>Manage AIs</I18n></div>
		<Form
			layout="vertical"
			style={ { marginBottom : 16 } }
		>
			<Form.Item label={<I18n>Startup AI Page</I18n>}>
				<Radio.Group
					value={ reaxel_SettingsView.store.UIControls.manage_AIs.startupAIPageLoadMode }
					onChange={ event => {
						setStartupAIPageLoadMode( event.target.value as Startup.AIPageLoadMode );
					} }
					style={ { userSelect : 'none' } }
				>
					<Space
						direction="vertical"
						size={ 4 }
					>
						<Radio value="last-used-ai"><I18n>Load the AI page used last time before exit</I18n></Radio>
						<Radio value="first-ai"><I18n>Always load the first AI page when app starts</I18n></Radio>
					</Space>
				</Radio.Group>
			</Form.Item>
		</Form>
		<Button
			type="primary"
			onClick={ () => {
				changeEditAIModalVisible( true );
			} }
			style={ { marginBottom : 16 } }
		><I18n>Add AI Page</I18n></Button>
		<DndContext
			sensors={ sensors }
			modifiers={ [ restrictToVerticalAxis ] }
			onDragEnd={ onDragEnd }
		>
			<SortableContext
				items={ reaxel_SettingsView.store.Data.AIs.map( ai => ai.id ) }
				strategy={ verticalListSortingStrategy }
			>
				<Table
					components={ {
						body : {
							row : SortableRow,
						},
					} }
					rowKey="id"
					columns={ columns }
					dataSource={ reaxel_SettingsView.store.Data.AIs }
					pagination={ false }
					size="small"
					rowClassName={ record => {
						const { isNewAI , isModifiedAI } = reaxel_SettingsView();
						if( isNewAI( record.id ) ) return 'ai-row--new';
						if( isModifiedAI( record.id ) ) return 'ai-row--modified';
						return '';
					} }
				/>
			</SortableContext>
		</DndContext>
		<div style={ { marginTop : 16 , display : 'flex' , justifyContent : 'flex-end' } }>
			<Button
				danger
				type="primary"
				onClick={ () => setResetModalVisible( true ) }
			><I18n>Reset All AI Pages</I18n></Button>
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
}>( {} );

const DragHandle:React.FC = () => {
	const { listeners , attributes } = React.useContext( DragHandleContext );
	return <span
		style={ { display : 'inline-flex' , alignItems : 'center' , cursor : 'move' } }
		{ ...attributes }
		{ ...listeners }
	>
		<DragIconSvg
			style={ { fontSize : 24 , userSelect : 'none' , cursor : 'move' , color : '#bfbfbf' } }
		/>
	</span>;
};

const SortableRow:React.FC<Readonly<RowProps>> = reaxper( props => {
	const {
		attributes ,
		listeners ,
		setNodeRef ,
		transform ,
		transition ,
		isDragging,
	} = useSortable( {
		id : props['data-row-key'],
	} );
	
	const style:React.CSSProperties = {
		...props.style ,
		transform : CSS.Translate.toString( transform ) ,
		transition ,
		...( isDragging ? { position : 'relative' , zIndex : 9999 } : {} ),
	};
	
	return <DragHandleContext.Provider value={ { listeners , attributes } }>
		<tr
			{ ...props }
			ref={ setNodeRef }
			style={ style }
		/>
	</DragHandleContext.Provider>;
} );

const EditAIModal = reaxper( () => {
	const { edit_AI_modal:store } = reaxel_SettingsView.store.UIControls.manage_AIs;
	const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
	const {
		changeEditAIModalVisible ,
		createDefaultAIName,
	} = reaxel_SettingsView();
	
	const fields = store.fields;
	const ProxyComponent = {
		from_server_list : <SelectProxyServer/> ,
		user_fill : <UserFillProxy/>,
	}[fields.proxy_mode] ?? null;
	
	const [urlEditing , setUrlEditing] = React.useState( false );
	const [urlDraft , setUrlDraft] = React.useState( '' );
	
	// 当modal开始打开时重置编辑状态
	React.useEffect( () => {
		if( store.visible ) {
			setUrlEditing( false );
			setUrlDraft( '' );
		}
	} , [store.visible] );
	
	const isCustomFamily = fields.AI_family === 'custom';
	// 内置 family 的 URL 可选择覆盖; custom family 的 URL 直接属于当前 AI 实例.
	const displayUrl = isCustomFamily ? fields.url : fields.url_override || defaultURLByFamily( fields.AI_family );
	const isFirstAIForcedPreload = reaxel_SettingsView.store.UIControls.manage_AIs.startupAIPageLoadMode === 'first-ai'
		&& store.mode === 'edit'
		&& reaxel_SettingsView.store.Data.AIs[0]?.id === store.editing_id;
	
	const handleSave = () => {
		const effectiveUrl = ( isCustomFamily ? fields.url : fields.url_override || defaultURLByFamily( fields.AI_family ) ).trim();
		if( !effectiveUrl ) {
			message.error( i18n( 'URL is required for custom AI' ) );
			return;
		}
		const nextAI:AI.AIItem = {
			id : store.editing_id || createAIId() ,
			label : fields.label?.trim() || ( isCustomFamily ? 'Custom AI' : fields.AI_family ) ,
			disabled : false ,
			AI_family : fields.AI_family ,
			url : effectiveUrl ,
			url_override : isCustomFamily ? null : fields.url_override ,
			desc : fields.desc ,
			preloadOnStartup : fields.preloadOnStartup === true ,
			proxy_mode : fields.proxy_mode ,
			from_server_list_proxy : getEnabledProxyServerId( fields.from_server_list_proxy ) ,
			user_fill_proxy : fields.user_fill_proxy || null,
		};
		
		reaxel_SettingsView.mutate.Data( state => {
			const index = state.AIs.findIndex( ai => ai.id === nextAI.id );
			if( index === -1 ) {
				state.AIs = [ ...state.AIs , nextAI ];
			} else {
				state.AIs = state.AIs.map( ( ai , i ) =>
					i === index
						? { ...ai , ...nextAI , disabled : ai.disabled }
						: ai,
				);
			}
		} );
		
		setState( {
			visible : false ,
			editing_id : null,
		} );
	};
	
	// URL尾部按钮组
	const urlSuffix = isCustomFamily
		? null
		: urlEditing
		? <Space size={ 4 }>
			<Button
				type="link"
				size="small"
				onClick={ () => {
					// Save: 将draft保存到url_override
					const trimmed = urlDraft.trim();
					const defaultUrl = defaultURLByFamily( fields.AI_family );
					setState.fields( {
						url_override : trimmed && trimmed !== defaultUrl ? trimmed : null,
					} );
					setUrlEditing( false );
				} }
			>Save</Button>
			<Button
				type="link"
				size="small"
				onClick={ () => {
					setUrlEditing( false );
					setUrlDraft( '' );
				} }
			>Cancel</Button>
		</Space>
		: <Space size={ 4 }>
			<Button
				type="link"
				size="small"
				onClick={ () => {
					setUrlDraft( displayUrl );
					setUrlEditing( true );
				} }
			>Edit</Button>
			{ fields.url_override ? <Button
				type="link"
				size="small"
				danger
				onClick={ () => {
					// Reset: 丢弃override，使用默认URL
					setState.fields( { url_override : null } );
				} }
			>Reset</Button> : null }
		</Space>;
	
	return <Modal
		open={ store.visible }
		title={ store.mode === 'add' ? <I18n>Add AI Page</I18n> : <I18n>Edit AI Page</I18n> }
		onCancel={ () => {
			changeEditAIModalVisible( false );
		} }
		onOk={ handleSave }
		okText={i18n('Save')}
		cancelText={i18n('Cancel')}
		width={ 520 }
	>
		<Form layout="vertical" style={ { marginTop : 16 } }>
			<Form.Item label={<I18n>AI name</I18n>}>
				<Input
					value={ fields.label }
					onChange={ event => {
						setState.fields( { label : event.target.value } );
					} }
				/>
			</Form.Item>
			<Form.Item label={<I18n>AI family</I18n>}>
				<Select
					value={ fields.AI_family }
					onChange={ value => {
						const family = value as AI.AIFamily;
						const defaultUrl = defaultURLByFamily( family );
						const patch:Partial<AI.EditAIItem> = {
							AI_family : family ,
							url : defaultUrl ,
							url_override : null,
						};
						if( store.mode === 'add' ) {
							patch.label = createDefaultAIName( family );
						}
						setState.fields( patch );
						setUrlEditing( false );
					} }
				>
					{ AIFamily.map( item => (
						<Select.Option
							key={ item }
							value={ item }
						>{ item }</Select.Option>
					) ) }
				</Select>
			</Form.Item>
			<Form.Item label={<I18n>AI URL</I18n>}>
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
					suffix={ urlSuffix }
				/>
			</Form.Item>
			<Form.Item label={<I18n>Proxy</I18n>}>
				<Radio.Group
					value={ fields.proxy_mode }
					onChange={ event => {
						const proxyMode = event.target.value as NetworkProxy.AIProxyMode;
						const patch:Partial<AI.EditAIItem> = { proxy_mode : proxyMode };
						if( proxyMode === 'user_fill' && !fields.user_fill_proxy ) {
							patch.user_fill_proxy = defaultProxyConf();
						}
						if( proxyMode === 'from_server_list' && !getEnabledProxyServerId( fields.from_server_list_proxy ) ) {
							patch.from_server_list_proxy = firstEnabledProxyServerId();
						}
						setState.fields( patch );
					} }
					style={ { userSelect : 'none' } }
				>
					<Space direction="vertical" size={ 4 }>
						<Radio value="follow_global_setting"><I18n>Follow Global Setting</I18n></Radio>
						<Radio value="direct"><I18n>Direct</I18n></Radio>
						<Radio value="from_server_list"><I18n>Select From List</I18n></Radio>
						<Radio value="user_fill"><I18n>Manual</I18n></Radio>
					</Space>
				</Radio.Group>
				{ ProxyComponent }
			</Form.Item>
			<Form.Item
				label={<I18n>Preload on Startup</I18n>}
				valuePropName="checked"
			>
				<Space
					size={ 6 }
					align="center"
				>
					<Checkbox
						checked={ isFirstAIForcedPreload || ( fields.preloadOnStartup ?? false ) }
						disabled={ isFirstAIForcedPreload }
						onChange={ e => {
							setState.fields( { preloadOnStartup : e.target.checked } );
						} }
						style={ { userSelect : 'none' } }
					>
						<I18n>Load this AI immediately when app starts</I18n>
					</Checkbox>
					{ isFirstAIForcedPreload ? <Tooltip title={<I18n>When [Always load the first AI page when app starts] is checked, this option is always selected</I18n>}>
						<InfoCircleOutlined style={ { color : '#8c8c8c' } }/>
					</Tooltip> : null }
				</Space>
			</Form.Item>
		</Form>
	</Modal>;
} );

export const SelectProxyServer = reaxper( () => {
	const { edit_AI_modal:store } = reaxel_SettingsView.store.UIControls.manage_AIs;
	const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
	const proxyServers = reaxel_SettingsView.store.UIControls.networks.proxy_server_list.filter( server => server.enabled !== false );
	const selectedProxyServerId = getEnabledProxyServerId( store.fields.from_server_list_proxy );
	
	return <Select
		style={ { width : '100%' , marginTop : 12 } }
		value={ selectedProxyServerId || undefined }
		placeholder={i18n('Select a proxy server')}
		onChange={ value => {
			setState.fields( {
				from_server_list_proxy : value || null,
			} );
		} }
		allowClear
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
	
	return <div style={ { marginTop : 12 , padding : '12px 16px' , background : '#fafafa' , borderRadius : 6 } }>
		<Form.Item label={<I18n>Protocol</I18n>}>
			<Segmented
				style={ { userSelect : 'none' } }
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
		</Form.Item>
		<Form.Item label={<I18n>Host name</I18n>}>
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
		</Form.Item>
		<Form.Item label={<I18n>Port number</I18n>}>
			<InputNumber
				min={ 0 }
				max={ 65535 }
				value={ userFillProxy.port }
				placeholder="7890"
				onChange={ value => {
					setState.fields( {
						user_fill_proxy : {
							...userFillProxy ,
							port : value,
						},
					} );
				} }
			/>
		</Form.Item>
		<Checkbox
			checked={ !!userFillProxy.proxy_auth }
			onChange={ e => {
				setState.fields( {
					user_fill_proxy : {
						...userFillProxy ,
						proxy_auth : e.target.checked
							? { username : '' , password : '' }
							: false,
					},
				} );
			} }
			style={ { userSelect : 'none' } }
		><I18n>Authentication</I18n></Checkbox>
		{ userFillProxy.proxy_auth ? <ProxyAuthFields proxyConf={ userFillProxy }/> : null }
	</div>;
} );

const ProxyAuthFields = reaxper( ( { proxyConf }:{ proxyConf:NetworkProxy.ProxyConfFields } ) => {
	const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
	const proxyAuth = notFalse( proxyConf.proxy_auth );
	
	return <>
		<Form.Item label={<I18n>Username</I18n>} style={ { marginTop : 12 } }>
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
		</Form.Item>
		<Form.Item label={<I18n>Password</I18n>}>
			<Input.Password
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
		</Form.Item>
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

const defaultURLByFamily = (family:AI.AIFamily) => {
	return {
		chatgpt : 'https://chatgpt.com' ,
		grok : 'https://grok.com' ,
		gemini : 'https://gemini.google.com' ,
		deepseek : 'https://chat.deepseek.com' ,
		perplexity : 'https://www.perplexity.ai' ,
		claude : 'https://claude.ai' ,
		custom : '' ,
		'dev-proxy-test' : 'https://whatismyipaddress.com/',
	}[family] ?? 'https://chatgpt.com';
};

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
	'data-row-key': string;
}

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
	return <Modal
		open={ visible }
		title={ <span style={ { color : '#ff4d4f' } }><I18n>Reset All AI Pages</I18n></span> }
		onCancel={ onCancel }
		footer={ null }
		width={ 420 }
	>
		<div style={ { padding : '12px 0' } }>
			<p style={ { marginBottom : 16 , fontSize : 14 } }>
				<I18n>This will permanently reset all AI page configurations to factory defaults and clear page data including cookies, login state, localStorage, cache, and auth cache. All your custom AI pages, URL overrides, and proxy settings will be lost.</I18n>
			</p>
			<p style={ { marginBottom : 24 , color : '#ff4d4f' , fontWeight : 500 } }>
				<I18n>Hold the button below to confirm reset.</I18n>
			</p>
			<div style={ { display : 'flex' , justifyContent : 'center' , alignItems : 'center' , gap : 16 } }>
				<LongPressConfirmButton onConfirm={ onConfirm }/>
				<Button onClick={ onCancel }><I18n>Cancel</I18n></Button>
			</div>
		</div>
	</Modal>;
};

import { DragIconSvg } from "./DragIcon.svg";
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { resetAIsToDefaults } from "#src/Views/SettingsView/services/Settings";
import { AIFamily } from "#src/shared/statics/AI-family";
import { createDefaultProxyConf as defaultProxyConf } from "#src/shared/statics/default-proxy";
import { AI } from "#src/Types/SettingsTypes/AI";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import type { Startup } from "#src/Types/SettingsTypes/Startup";
import { InfoCircleOutlined } from '@ant-design/icons';
import React from 'react';
import { reaxper } from 'reaxes-react';
import {
	Button ,
	Checkbox ,
	Form ,
	Input ,
	InputNumber ,
	message ,
	Modal ,
	Radio ,
	Segmented ,
	Select ,
	Space ,
	Table ,
	TableColumnType ,
	Tag,
	Tooltip,
} from 'antd';
import { DndContext , PointerSensor , useSensor , useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
	arrayMove ,
	SortableContext ,
	useSortable ,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
