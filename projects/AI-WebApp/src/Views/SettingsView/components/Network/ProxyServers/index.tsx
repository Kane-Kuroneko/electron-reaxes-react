const {
	store : { UIControls : { networks : store } } ,
	setState : { UIControls : { networks : setState } },
} = reaxel_SettingsView;

export const ProxyServers = reaxper( () => {
	
	return <div className="settings-section">
		<div className="section-title">Proxy Servers</div>
		<Button
			onClick={() => {
				setState.edit_proxy_server_modal({
					visible : true,
					mode : 'add',
					editing_id : uuid(),
					fields : {
						server_name : '',
						enabled : true,
						proxy_conf : {
							protocol : 'http',
							hostname : '127.0.0.1',
							port : 7890,
							proxy_auth : false,
						},
					},
				})
			}}
			type="primary"
			style={{ marginBottom: 16 }}
		>
			Add Server
		</Button>
		<Table
			dataSource={ reaxel_SettingsView.store.UIControls.networks.proxy_server_list.map( it => {
				return {
					...it ,
					key : it.proxy_server_id,
				};
			} ) }
			columns={columns}
			pagination={false}
			size="small"
		/>
		<EditProxyServerModal/>
	</div>;
} );

const columns:TableColumnType<NetworkProxy.ProxyServer.Server>[] = [
	{
		title : 'Server Name' ,
		dataIndex : 'server_name' ,
		key : 'server_name' ,
	} ,
	{
		title : 'Enabled' ,
		render(value,record){
			return <Checkbox
				checked={ record.enabled }
				onChange={ ( e ) => {
					reaxel_SettingsView.mutate.UIControls.networks( state => {
						const target = state.proxy_server_list.find( server => server.proxy_server_id === record.proxy_server_id );
						if( target ) {
							target.enabled = e.target.checked;
						}
					} );
				} }
			/>;
		},
	} ,
	{
		title : 'Address' ,
		render(value,{proxy_conf:{protocol,hostname,port}},index){
			return <span>{protocol}://{hostname}:{port}</span>
		}
	} ,
	{
		title : 'Operations',
		render(value,record,index){
			return <Button
				type="link"
				onClick={ () => {
					console.log(record);
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
			>Edit</Button>;
		}
	} ,
	{
		title : 'Delete',
		render(value,record){
			return <Button
				type="link"
				danger
				onClick={ () => {
					reaxel_SettingsView.mutate.UIControls.networks( state => {
						state.proxy_server_list = state.proxy_server_list.filter( server => server.proxy_server_id !== record.proxy_server_id );
						if( state.using_proxy_server_id === record.proxy_server_id ) {
							state.using_proxy_server_id = null;
						}
					} );
				} }
			>Delete</Button>;
		},
	}
];

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
			<Divider style={ { margin : '12px 0' } }>Auth</Divider>
			<Form.Item label="Username">
				<Input
					value={ notFalse( store.fields.proxy_conf.proxy_auth )?.username }
					placeholder="Username"
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
			<Form.Item label="Password">
				<Input
					value={ notFalse( store.fields.proxy_conf.proxy_auth )?.password }
					placeholder="Password"
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
		title={ mode === 'add' ? 'Add Proxy Server' : 'Edit Proxy Server' }
		open={ store.visible }
		onCancel={ () => {
			setState( {
				visible : false ,
			} );
		} }
		onOk={() => {
			reaxel_SettingsView.mutate.UIControls.networks( state => {
				const nextServer:NetworkProxy.ProxyServer.Server = {
					proxy_server_id : store.editing_id ,
					server_name : store.fields.server_name ,
					enabled : store.fields.enabled ,
					proxy_conf : store.fields.proxy_conf,
				};
				const index = state.proxy_server_list.findIndex( server => server.proxy_server_id === store.editing_id );
				if( index === -1 ) {
					state.proxy_server_list.push( nextServer );
				} else {
					state.proxy_server_list[index] = nextServer;
				}
				if( !state.using_proxy_server_id ) {
					state.using_proxy_server_id = nextServer.proxy_server_id;
				}
			} );
			setState( {
				visible : false ,
				editing_id : null,
			} );
		}}
		okText="Save"
		cancelText="Cancel"
	>
		<Form layout="vertical">
			<Form.Item label="Server name">
				<Input
					value={ store.fields.server_name }
					placeholder="Proxy server name"
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
				Enabled
			</Checkbox>
			<Form.Item label="Protocol">
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
			<Form.Item label="Host name">
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
			<Form.Item label="Port number">
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
				Authentication
			</Checkbox>
			{ProxyAuth}
		</Form>
	</Modal>;
} );

import {
	Checkbox ,
	Form ,
	Input ,
	Segmented ,
	Select ,
	Space ,
	InputNumber ,
	TableColumnType,
	Button,
	Modal,
	Divider,
	Table ,
} from 'antd';

import { reaxper  } from 'reaxes-react';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import {v4 as uuid} from 'uuid';
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
