const {
	store : { UIControls : { networks : store } } ,
	setState : { UIControls : { networks : setState } },
} = reaxel_SettingsView;

export const ProxyServers = reaxper( () => {
	
	const { Item } = Form;
	return <div className="">
		<Item
			label="Proxy Servers"
		>
			<Button
				onClick={() => {
					setState.edit_proxy_server_modal({
						visible : true,
						editing_id : uuid(),
						fields : {
							server_name : '',
							proxy_conf : {
								protocol : 'http',
								hostname : '127.0.0.1',
								port : 7890,
								proxy_auth : {
									username : '',
									password : '',
								},
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
						key : it.id,
					};
				} ) }
				columns={columns}
				pagination={false}
			/>
			<EditProxyServer/>
		</Item>
	</div>;
} );

const columns:TableColumnType<{
	id : string ,
	server_name : string ,
	proxy_conf : NetworkProxy.ProxyConfFields ,
}>[] = [
	{
		title : 'Server Name' ,
		dataIndex : 'server_name' ,
		key : 'server_name' ,
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
					setState.edit_proxy_server_modal( {
						visible : true ,
						editing_id : record.id ,
						fields : {
							server_name : record.server_name ,
							proxy_conf : record.proxy_conf ,
						} ,
					} );
				} }
			>Edit</Button>;
		}
	}
];

const EditProxyServer = reaxper( () => {
	return <Modal
		title="Edit Proxy Server"
		open={ store.edit_proxy_server_modal.visible }
		onCancel={ () => {
			setState.edit_proxy_server_modal( {
				visible : false ,
			} );
		} }
	>
		<div>
			<Form.Item
				label="Protocol :"
			>
				<Segmented
					value={ store.edit_proxy_server_modal.fields.proxy_conf.protocol }
					onChange={ ( value: NetworkProxy.Protocol ) => {
						setState.edit_proxy_server_modal.fields.proxy_conf( {
							protocol : value ,
						} );
					} }
					style={ { userSelect : 'none' } }
					options={ [
						{
							label : 'HTTP' ,
							value : 'http' ,
						} ,
						{
							label : 'HTTPS' ,
							value : 'https' ,
						} ,
						{
							label : 'Socks5' ,
							value : 'socks5' ,
						} ,
					] }
				/>
			</Form.Item>
			<Form.Item
				label="Host name :"
			>
				<Input
					variant="underlined"
					value={ store.edit_proxy_server_modal.fields.proxy_conf.hostname }
					placeholder="127.0.0.1"
					onChange={ ( e ) => {
						setState.edit_proxy_server_modal.fields.proxy_conf( {
							hostname : e.target.value ,
						} );
					} }
				/>
			</Form.Item>
			<Form.Item
				label="Port number :"
			>
				<InputNumber
					min={ 0 }
					max={ 65535 }
					value={ store.edit_proxy_server_modal.fields.proxy_conf.port }
					variant="underlined"
					placeholder="7890"
					onChange={ ( value ) => {
						setState.edit_proxy_server_modal.fields.proxy_conf( {
							port : value ,
						} );
					}}
				/>
			</Form.Item>
		</div>
	</Modal>;
} );

import {
	Checkbox ,
	Form ,
	Input ,
	Radio ,
	Table ,
	Segmented ,
	Select ,
	Space ,
	InputNumber ,
	TableColumnType,
    Button,
    Modal,
} from 'antd';

import { reaxper  } from 'reaxes-react';
// import less from './index.module.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { SearchOutlined } from '@ant-design/icons';
import {v4 as uuid} from 'uuid';
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
