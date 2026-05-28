const columns:TableColumnType<AI.AIItem>[] = [
	{
		title : 'Drag' ,
		width : 60 ,
		render() {
			return <DragIconSvg
				style={ { fontSize : 24 , userSelect : 'none' , cursor : 'move' , color : '#bfbfbf' } }
			/>;
		},
	} ,
	{
		title : 'Enabled' ,
		width : 80 ,
		render( _value , record ) {
			return <Checkbox
				checked={ !record.disabled }
				onChange={ e => {
					reaxel_SettingsView.mutate.Data( state => {
						const target = state.AIs.find( ai => ai.id === record.id );
						if( target ) {
							target.disabled = !e.target.checked;
						}
					} );
				} }
			/>;
		},
	} ,
	{
		title : 'App name' ,
		dataIndex : 'label',
	} ,
	{
		title : 'Family' ,
		dataIndex : 'AI_family',
	} ,
	{
		title : 'Url' ,
		dataIndex : 'url' ,
		ellipsis : true,
	} ,
	{
		title : 'Operations' ,
		width : 160 ,
		render : ( _text , record ) => {
			const { changeEditAIModalVisible } = reaxel_SettingsView();
			return <Space size={ 4 }>
				<Button
					type="link"
					size="small"
					onClick={ () => {
						changeEditAIModalVisible( true , record.id );
					} }
				>Edit</Button>
				<Button
					type="link"
					size="small"
					danger
					onClick={ () => {
						Modal.confirm( {
							title : 'Delete AI page' ,
							content : `Delete ${ record.label } from Switch AI menu and settings.`,
							onOk() {
								reaxel_SettingsView.mutate.Data( state => {
									state.AIs = state.AIs.filter( ai => ai.id !== record.id );
								} );
							},
						} );
					} }
				>Delete</Button>
			</Space>;
		},
	},
];

export const RCManageAIsPanel = reaxper( () => {
	const { changeEditAIModalVisible } = reaxel_SettingsView();
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
	
	return <div className="settings-section">
		<div className="section-title">Manage AIs</div>
		<Button
			type="primary"
			onClick={ () => {
				changeEditAIModalVisible( true );
			} }
			style={ { marginBottom : 16 } }
		>Add AI Page</Button>
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
				/>
			</SortableContext>
		</DndContext>
		<EditAIModal/>
	</div>;
} );

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
	
	return <tr
		{ ...props }
		ref={ setNodeRef }
		style={ style }
		{ ...attributes }
		{ ...listeners }
	/>;
} );

const EditAIModal = reaxper( () => {
	const { edit_AI_modal:store } = reaxel_SettingsView.store.UIControls.manage_AIs;
	const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
	
	const fields = store.fields;
	const ProxyComponent = {
		from_server_list : <SelectProxyServer/> ,
		user_fill : <UserFillProxy/>,
	}[fields.proxy_mode] ?? null;
	
	const handleSave = () => {
		const nextAI:AI.AIItem = {
			id : store.editing_id || createAIId() ,
			label : fields.label?.trim() || fields.AI_family ,
			disabled : false ,
			AI_family : fields.AI_family ,
			url : fields.url?.trim() || defaultURLByFamily( fields.AI_family ) ,
			desc : fields.desc ,
			preloadOnStartup : fields.preloadOnStartup === true ,
			proxy_mode : fields.proxy_mode ,
			from_server_list_proxy : fields.from_server_list_proxy || null ,
			user_fill_proxy : fields.user_fill_proxy || null,
		};
		
		reaxel_SettingsView.mutate.Data( state => {
			const index = state.AIs.findIndex( ai => ai.id === nextAI.id );
			if( index === -1 ) {
				state.AIs.push( nextAI );
			} else {
				state.AIs[index] = {
					...state.AIs[index] ,
					...nextAI ,
					disabled : state.AIs[index].disabled,
				};
			}
		} );
		
		setState( {
			visible : false ,
			editing_id : null,
		} );
	};
	
	return <Modal
		open={ store.visible }
		title={ store.mode === 'add' ? 'Add AI Page' : 'Edit AI Page' }
		onCancel={ () => {
			setState( {
				visible : false ,
				editing_id : null,
			} );
		} }
		onOk={ handleSave }
		okText="Save"
		cancelText="Cancel"
		width={ 520 }
	>
		<Form layout="vertical" style={ { marginTop : 16 } }>
			<Form.Item label="App name">
				<Input
					value={ fields.label }
					onChange={ event => {
						setState.fields( { label : event.target.value } );
					} }
				/>
			</Form.Item>
			<Form.Item label="App family">
				<Select
					value={ fields.AI_family }
					onChange={ value => {
						setState.fields( {
							AI_family : value ,
							url : fields.url || defaultURLByFamily( value ),
						} );
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
			<Form.Item label="App url">
				<Input
					value={ fields.url }
					onChange={ event => {
						setState.fields( { url : event.target.value } );
					} }
				/>
			</Form.Item>
			<Form.Item label="Proxy">
				<Radio.Group
					value={ fields.proxy_mode }
					onChange={ event => {
						const proxyMode = event.target.value as NetworkProxy.AIProxyMode;
						const patch:Partial<AI.EditAIItem> = { proxy_mode : proxyMode };
						if( proxyMode === 'user_fill' && !fields.user_fill_proxy ) {
							patch.user_fill_proxy = defaultProxyConf();
						}
						if( proxyMode === 'from_server_list' && !fields.from_server_list_proxy ) {
							patch.from_server_list_proxy = firstEnabledProxyServerId();
						}
						setState.fields( patch );
					} }
					style={ { userSelect : 'none' } }
				>
					<Space direction="vertical" size={ 4 }>
						<Radio value="follow_global_setting">Follow Global Setting</Radio>
						<Radio value="direct">Direct</Radio>
						<Radio value="from_server_list">Select From List</Radio>
						<Radio value="user_fill">Manual</Radio>
					</Space>
				</Radio.Group>
				{ ProxyComponent }
			</Form.Item>
			<Form.Item
				label="Preload on Startup"
				valuePropName="checked"
			>
				<Checkbox
					checked={ fields.preloadOnStartup ?? false }
					onChange={ e => {
						setState.fields( { preloadOnStartup : e.target.checked } );
					} }
					style={ { userSelect : 'none' } }
				>
					Load this AI immediately when app starts
				</Checkbox>
			</Form.Item>
		</Form>
	</Modal>;
} );

export const SelectProxyServer = reaxper( () => {
	const { edit_AI_modal:store } = reaxel_SettingsView.store.UIControls.manage_AIs;
	const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
	const proxyServers = reaxel_SettingsView.store.UIControls.networks.proxy_server_list.filter( server => server.enabled );
	
	return <Select
		style={ { width : '100%' , marginTop : 12 } }
		value={ store.fields.from_server_list_proxy }
		placeholder="Select a proxy server"
		onChange={ value => {
			setState.fields( {
				from_server_list_proxy : value,
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
	
	return <div style={ { marginTop : 12 , padding : '12px 16px' , background : '#fafafa' , borderRadius : 6 } }>
		<Form.Item label="Protocol">
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
		<Form.Item label="Host name">
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
		<Form.Item label="Port number">
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
		>Authentication</Checkbox>
		{ userFillProxy.proxy_auth ? <ProxyAuthFields proxyConf={ userFillProxy }/> : null }
	</div>;
} );

const ProxyAuthFields = reaxper( ( { proxyConf }:{ proxyConf:NetworkProxy.ProxyConfFields } ) => {
	const { edit_AI_modal:setState } = reaxel_SettingsView.setState.UIControls.manage_AIs;
	const proxyAuth = notFalse( proxyConf.proxy_auth );
	
	return <>
		<Form.Item label="Username" style={ { marginTop : 12 } }>
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
		<Form.Item label="Password">
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

const defaultProxyConf = ():NetworkProxy.ProxyConfFields => ( {
	protocol : 'http' ,
	hostname : '127.0.0.1' ,
	port : 7897 ,
	proxy_auth : false,
} );

const firstEnabledProxyServerId = () => {
	return reaxel_SettingsView.store.UIControls.networks.proxy_server_list.find( server => server.enabled )?.proxy_server_id || null;
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
		'dev-proxy-test' : 'https://whatismyipaddress.com/',
	}[family] || 'https://chatgpt.com';
};

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
	'data-row-key': string;
}

import { DragIconSvg } from "./DragIcon.svg";
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { AIFamily } from "#src/shared/statics/AI-family";
import { AI } from "#src/Types/SettingsTypes/AI";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { reaxper } from 'reaxes-react';
import {
	Button ,
	Checkbox ,
	Form ,
	Input ,
	InputNumber ,
	Modal ,
	Radio ,
	Segmented ,
	Select ,
	Space ,
	Table ,
	TableColumnType,
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
