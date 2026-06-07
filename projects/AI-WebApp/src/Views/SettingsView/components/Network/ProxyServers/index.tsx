const {
	store : { UIControls : { networks : store } } ,
	setState : { UIControls : { networks : setState } },
} = reaxel_SettingsView;

export const ProxyServers = reaxper( () => {
	const [proxyTestModal , setProxyTestModal] = React.useState<{
		visible:boolean;
		server:NetworkProxy.ProxyServer.Server | null;
	}>( {
		visible : false ,
		server : null,
	} );

	return <div className="settings-section">
		<div className="section-title"><I18n>Proxy Servers</I18n></div>
		<Button
			onClick={() => {
				setState.edit_proxy_server_modal({
					visible : true,
					mode : 'add',
					editing_id : uuid(),
					fields : {
						server_name : '',
						enabled : true,
						proxy_conf : defaultProxyConf(),
					},
				})
			}}
			type="primary"
			style={{ marginBottom: 16 }}
		>
			<I18n>Add Server</I18n>
		</Button>
		<Table
			dataSource={ reaxel_SettingsView.store.UIControls.networks.proxy_server_list.map( it => {
				return {
					...it ,
					key : it.proxy_server_id,
				};
			} ) }
			columns={ createColumns( server => {
				setProxyTestModal( {
					visible : true ,
					server,
				} );
			} ) }
			pagination={false}
			size="small"
		/>
		<ProxyServerTestModal
			visible={ proxyTestModal.visible }
			server={ proxyTestModal.server }
			onCancel={ () => {
				setProxyTestModal( {
					visible : false ,
					server : null,
				} );
			} }
		/>
		<EditProxyServerModal/>
	</div>;
} );

const createColumns = (openProxyTestModal:(server:NetworkProxy.ProxyServer.Server) => void):TableColumnType<NetworkProxy.ProxyServer.Server>[] => [
	{
		title : <I18n>Server Name</I18n> ,
		dataIndex : 'server_name' ,
		key : 'server_name' ,
	} ,
	{
		title : <I18n>Enabled</I18n> ,
		render(value,record){
			return <Checkbox
				checked={ record.enabled }
				onChange={ ( e ) => {
					const enabled = e.target.checked;
					reaxel_SettingsView.mutate( state => {
						const target = state.UIControls.networks.proxy_server_list.find( server => {
							return server.proxy_server_id === record.proxy_server_id;
						} );
						if( target ) {
							target.enabled = enabled;
						}
						if( !enabled ) {
							clearProxyServerReferences( state , record.proxy_server_id );
						}
					} );
				} }
			/>;
		},
	} ,
	{
		title : <I18n>Address</I18n> ,
		render(value,{proxy_conf:{protocol,hostname,port}},index){
			return <span>{protocol}://{hostname}:{port}</span>
		}
	} ,
	{
		title : <I18n>Operations</I18n>,
		render(value,record,index){
			return <Space size={ 4 }>
				<Button
					type="link"
					onClick={ () => {
						setState.edit_proxy_server_modal( {
							visible : true ,
							mode : 'edit' ,
							editing_id : record.proxy_server_id ,
							fields : {
								server_name : record.server_name ,
								enabled : record.enabled ,
								proxy_conf : record.proxy_conf ,
							} ,
						} );
					} }
				><I18n>Edit</I18n></Button>
				<Button
					type="link"
					onClick={ () => openProxyTestModal( record ) }
				><I18n>Test</I18n></Button>
			</Space>;
		}
	} ,
	{
		title : <I18n>Delete</I18n>,
		render(value,record){
			return <Button
				type="link"
				danger
				onClick={ () => {
					reaxel_SettingsView.mutate( state => {
						state.UIControls.networks.proxy_server_list = state.UIControls.networks.proxy_server_list.filter( server => {
							return server.proxy_server_id !== record.proxy_server_id;
						} );
						clearProxyServerReferences( state , record.proxy_server_id );
					} );
				} }
			><I18n>Delete</I18n></Button>;
		},
	}
];

const clearProxyServerReferences = (state , proxyServerId:string) => {
	const networks = state.UIControls.networks;
	if( networks.using_proxy_server_id === proxyServerId ) {
		networks.using_proxy_server_id = null;
	}
	state.Data.AIs.forEach( ai => {
		if( ai.from_server_list_proxy === proxyServerId ) {
			ai.from_server_list_proxy = null;
		}
	} );
	const fields = state.UIControls.manage_AIs.edit_AI_modal.fields;
	if( fields.from_server_list_proxy === proxyServerId ) {
		fields.from_server_list_proxy = null;
	}
};

const ProxyServerTestModal = reaxper( ( {
	visible ,
	server ,
	onCancel,
}:{
	visible:boolean;
	server:NetworkProxy.ProxyServer.Server | null;
	onCancel:() => void;
} ) => {
	return <Modal
		title={ <span><I18n>Test Proxy Server</I18n>{ server ? ` - ${ server.server_name }` : '' }</span> }
		open={ visible }
		onCancel={ onCancel }
		footer={ null }
		width={ 560 }
	>
		{ server ? <ProxyTestPanel proxyConf={ server.proxy_conf }/> : null }
	</Modal>;
} );

const ProxyTestPanel = reaxper( ( { proxyConf }:{ proxyConf:NetworkProxy.ProxyConfFields } ) => {
	const proxyTestURLs = reaxel_SettingsView.store.UIControls.networks.proxy_test_urls;

	return <Space
		direction="vertical"
		size={ 12 }
		style={ { width : '100%' } }
	>
		<ProxyTestItem
			target="foreign"
			label={ <I18n>Foreign IP URL</I18n> }
			url={ proxyTestURLs.foreign }
			proxyConf={ proxyConf }
		/>
		<ProxyTestItem
			target="domestic"
			label={ <I18n>Domestic IP URL</I18n> }
			url={ proxyTestURLs.domestic }
			proxyConf={ proxyConf }
		/>
	</Space>;
} );

const ProxyTestItem = reaxper( ( {
	target ,
	label ,
	url ,
	proxyConf,
}:{
	target:NetworkProxy.ProxyTestTarget;
	label:React.ReactNode;
	url:string;
	proxyConf:NetworkProxy.ProxyConfFields;
} ) => {
	const [testing , setTesting] = React.useState( false );
	const [result , setResult] = React.useState<NetworkProxy.ProxyTestResult | null>( null );
	const {
		setProxyTestURL,
	} = reaxel_SettingsView();
	const defaultURL = defaultProxyTestURLs()[target];
	const proxyConfSnapshot = JSON.stringify( proxyConf );

	React.useEffect( () => {
		setResult( null );
	} , [url , proxyConfSnapshot] );

	const changeURL = (nextURL:string) => {
		setResult( null );
		void setProxyTestURL( target , nextURL ).catch( error => {
			message.error( error?.message || String( error ) );
		} );
	};

	const runTest = async() => {
		setTesting( true );
		try {
			const nextResult = await testProxyServer( proxyConf , url );
			setResult( nextResult );
		} catch ( error ) {
			setResult( {
				...createLocalProxyTestDiagnostic( proxyConf ) ,
				success : false ,
				url ,
				durationMs : 0 ,
				error : error?.message || String( error ),
			} );
		} finally {
			setTesting( false );
		}
	};

	const success = result?.success === true;
	const failed = result && !result.success;
	const itemBorderColor = success
		? '#52c41a'
		: failed
		? '#ff4d4f'
		: 'transparent';
	const itemBackground = success
		? 'rgba(82, 196, 26, 0.06)'
		: failed
		? 'rgba(255, 77, 79, 0.06)'
		: 'transparent';
	const fallbackDiagnostic = createLocalProxyTestDiagnostic( proxyConf );
	const diagnostic = result
		? {
			proxyServer : result.proxyServer || fallbackDiagnostic.proxyServer ,
			proxyRules : result.proxyRules || fallbackDiagnostic.proxyRules ,
		}
		: null;

	return <div
		style={ {
			border : `1px solid ${ itemBorderColor }` ,
			background : itemBackground ,
			borderRadius : 6 ,
			padding : 10 ,
			transition : 'border-color 0.2s ease, background 0.2s ease',
		} }
	>
		<Form.Item
			label={ label }
			style={ { marginBottom : 0 } }
		>
			<Space.Compact style={ { width : '100%' } }>
				<Input
					value={ url }
					onChange={ event => changeURL( event.target.value ) }
					suffix={ <Tooltip title={ <I18n>Reset</I18n> }>
						<Button
							type="text"
							size="small"
							icon={ <ReloadOutlined/> }
							onClick={ () => changeURL( defaultURL ) }
						/>
					</Tooltip> }
				/>
				<Button
					loading={ testing }
					onClick={ runTest }
				><I18n>Test</I18n></Button>
			</Space.Compact>
			<div
				style={ {
					minHeight : 22 ,
					marginTop : 4 ,
					fontSize : 12 ,
					color : success ? '#389e0d' : failed ? '#ff4d4f' : '#8c8c8c',
				} }
			>
				{ result
					? success
						? `${ i18n( 'IP Address' ) }: ${ result.ipAddress } (${ result.durationMs }ms)`
						: <>
							<div>{ result.error || i18n( 'Proxy test failed' ) }</div>
							{ diagnostic ? <div
								style={ {
									marginTop : 4 ,
									color : '#8c8c8c' ,
									wordBreak : 'break-all',
								} }
							>
								<div>{ `Proxy: ${ diagnostic.proxyServer }` }</div>
								<div>{ `Rules: ${ diagnostic.proxyRules }` }</div>
							</div> : null }
						</>
					: null }
			</div>
		</Form.Item>
	</div>;
} );

const createLocalProxyTestDiagnostic = (proxyConf:NetworkProxy.ProxyConfFields) => {
	const proxyServer = `${ proxyConf.hostname }:${ proxyConf.port }`;
	return {
		proxyServer ,
		proxyRules : `${ proxyConf.protocol }://${ proxyServer }`,
		proxyProtocol : proxyConf.protocol,
	};
};

const EditProxyServerModal = reaxper( () => {

	const {
		store : { UIControls : { networks : {edit_proxy_server_modal:store} } } ,
		setState : { UIControls : { networks : {edit_proxy_server_modal:setState} } },
	} = reaxel_SettingsView;

	const {mode} = store;

	if(mode === 'edit'){
		var editing = reaxel_SettingsView.store.UIControls.networks.proxy_server_list.find( it => it.proxy_server_id === store.editing_id );
	}else {

	}

	if(store.fields.proxy_conf.proxy_auth){
		var ProxyAuth = <>
			<Divider style={ { margin : '12px 0' } }><I18n>Auth</I18n></Divider>
			<Form.Item label={<I18n>Username</I18n>}>
				<Input
					value={ notFalse( store.fields.proxy_conf.proxy_auth )?.username }
					placeholder={i18n('Username')}
					onChange={ ( e ) => {
						setState.fields.proxy_conf( {
							proxy_auth : {
								...notFalse( store.fields.proxy_conf.proxy_auth ) ,
								username : e.target.value ,
							} ,
						} );
					} }
				/>
			</Form.Item>
			<Form.Item label={<I18n>Password</I18n>}>
				<Input.Password
					value={ notFalse( store.fields.proxy_conf.proxy_auth )?.password }
					placeholder={i18n('Password')}
					onChange={ ( e ) => {
						setState.fields.proxy_conf( {
							proxy_auth : {
								...notFalse( store.fields.proxy_conf.proxy_auth ) ,
								password : e.target.value ,
							} ,
						} );
					} }
				/>
			</Form.Item>
		</>;
	}

	return <Modal
		title={ mode === 'add' ? <I18n>Add Proxy Server</I18n> : <I18n>Edit Proxy Server</I18n> }
		open={ store.visible }
		onCancel={ () => {
			setState( {
				visible : false ,
			} );
		} }
		onOk={() => {
			reaxel_SettingsView.mutate( state => {
				const networks = state.UIControls.networks;
				const nextServer:NetworkProxy.ProxyServer.Server = {
					proxy_server_id : store.editing_id ,
					server_name : store.fields.server_name ,
					enabled : store.fields.enabled ,
					proxy_conf : store.fields.proxy_conf,
				};
				const index = networks.proxy_server_list.findIndex( server => {
					return server.proxy_server_id === store.editing_id;
				} );
				if( index === -1 ) {
					networks.proxy_server_list.push( nextServer );
				} else {
					networks.proxy_server_list[index] = nextServer;
				}
				if( !nextServer.enabled ) {
					clearProxyServerReferences( state , nextServer.proxy_server_id );
					return;
				}
				if( !networks.using_proxy_server_id ) {
					networks.using_proxy_server_id = nextServer.proxy_server_id;
				}
			} );
			setState( {
				visible : false ,
				editing_id : null,
			} );
		}}
		okText={i18n('Save')}
		cancelText={i18n('Cancel')}
	>
		<Form layout="vertical">
			<Form.Item label={<I18n>Server name</I18n>}>
				<Input
					value={ store.fields.server_name }
					placeholder={i18n('Proxy server name')}
					onChange={ ( e ) => {
						setState.fields( {
							server_name : e.target.value,
						} );
					} }
				/>
			</Form.Item>
			<Checkbox
				style={{userSelect:'none', marginBottom: 16}}
				checked={store.fields.enabled}
				onChange={(e) => {
					setState.fields( {
						enabled : e.target.checked,
					} );
				}}
			>
				<I18n>Enabled</I18n>
			</Checkbox>
			<Form.Item label={<I18n>Protocol</I18n>}>
				<Segmented
					value={ store.fields.proxy_conf.protocol }
					onChange={ ( value: NetworkProxy.Protocol ) => {
						setState.fields.proxy_conf( {
							protocol : value ,
						} );
					} }
					style={ { userSelect : 'none' } }
					options={ [
						{ label : 'HTTP' , value : 'http' } ,
						{ label : 'HTTPS' , value : 'https' } ,
						{ label : 'Socks5' , value : 'socks5' } ,
					] }
				/>
			</Form.Item>
			<Form.Item label={<I18n>Host name</I18n>}>
				<Input
					value={ store.fields.proxy_conf.hostname }
					placeholder="127.0.0.1"
					onChange={ ( e ) => {
						setState.fields.proxy_conf( {
							hostname : e.target.value ,
						} );
					} }
				/>
			</Form.Item>
			<Form.Item label={<I18n>Port number</I18n>}>
				<InputNumber
					min={ 0 }
					max={ 65535 }
					value={ store.fields.proxy_conf.port }
					placeholder="7890"
					onChange={ ( value ) => {
						setState.fields.proxy_conf( {
							port : value ,
						} );
					}}
				/>
			</Form.Item>
			<Checkbox
				style={{userSelect:'none'}}
				checked={!!store.fields.proxy_conf.proxy_auth}
				onChange={(e) => {
					setState.fields.proxy_conf( {
						proxy_auth : e.target.checked ? {
							username : '' ,
							password : '' ,
						} : false ,
					} );
				}}
			>
				<I18n>Authentication</I18n>
			</Checkbox>
			{ProxyAuth}
			<Divider style={ { margin : '16px 0 12px' } }><I18n>Proxy Test</I18n></Divider>
			<ProxyTestPanel proxyConf={ store.fields.proxy_conf }/>
		</Form>
	</Modal>;
} );

import {
	Checkbox ,
	Form ,
	Input ,
	Segmented ,
	Space ,
	InputNumber ,
	TableColumnType,
	Button,
	Modal,
	Divider,
	Table ,
	message,
	Tooltip,
} from 'antd';

import { reaxper  } from 'reaxes-react';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { testProxyServer } from "#src/Views/SettingsView/services/Settings";
import {
	createDefaultProxyConf as defaultProxyConf ,
	createDefaultProxyTestURLs as defaultProxyTestURLs,
} from "#src/shared/statics/default-proxy";
import {v4 as uuid} from 'uuid';
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
import { ReloadOutlined } from '@ant-design/icons';
import React from 'react';
