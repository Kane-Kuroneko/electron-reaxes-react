const {
	store : { UIControls : { networks : store } } ,
	setState : { UIControls : { networks : setState } },
} = reaxel_SettingsView;

export const GlobalProxy = reaxper( () => {
	
	const { Item } = Form;
	return <div className={ less.globalProxy }>
		<Item
			label="Global Proxy"
		>
			<Radio.Group
				value={ store.proxy_mode }
				onChange={ ( e ) => {
					setState( {
						proxy_mode : e.target.value ,
					} );
				} }
				style={ { userSelect : 'none' } }
			>
				<Radio value="direct">Direct(No Proxy)</Radio>
				<Radio value="use_system">Follow system proxy settings</Radio>
				<Radio value="from_proxy_server">Manual proxy configuration</Radio>
				<Radio value="user_fill">Manual proxy configuration</Radio>
			</Radio.Group>
			
			<ManualProxy/>
		</Item>
		
	</div>;
} );

const ManualProxy = reaxper( () => {
	if(store.proxy_mode !== 'user_fill'){
		return null;
	}
	return <div>
		<Form.Item
			label="Protocol :"
		>
			<Segmented
				value={notFalse(store.proxy_fields).protocol}
				onChange={ ( value:NetworkProxy.Protocol ) => {
					setState.proxy_fields( {
						...notFalse( store.proxy_fields ) ,
						protocol : value ,
					} );
				}}
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
			layout="vertical"
		>
			<Input
				variant="underlined"
				value={notFalse(store.proxy_fields).hostname }
				placeholder="127.0.0.1"
				onChange={
					( e ) => {
						setState( {
							proxy_fields:{
								...notFalse(store.proxy_fields),
								hostname : e.target.value ,
							}
						} );
					}
				}
			/>
		</Form.Item>
		<Form.Item
			label="Port number :"
		>
			<InputNumber
				min={0}
				max={65535}
				value={ notFalse(store.proxy_fields).port }
				variant="underlined"
				placeholder="7890"
				onChange={
					( value ) => {
						setState( {
							proxy_fields:{
								...notFalse(store.proxy_fields),
								port : value ,
							}
						} );
					}
				}
			/>
		</Form.Item>
		<Form.Item
			label={ <label>
				<Space size={ 3 }>
					<Checkbox
						checked={ store.proxy_fields.no_proxy_for__enabled }
						onChange={ ( e ) => {
							setState( {
								proxy_fields : {
									...notFalse( store.proxy_fields ) ,
									no_proxy_for__enabled : e.target.checked ,
								} ,
							} );
						} }
					/>
					<span style={ { userSelect : 'none' } }>No proxy for :</span>
				</Space>
			</label> }
		>
			<Select
				disabled={ !store.proxy_fields.no_proxy_for__enabled }
				mode="multiple"
				options={ [] }
				value={ store.proxy_fields.no_proxy_for }
				variant="underlined"
			/>
		</Form.Item>
	</div>
} );


import {
	Checkbox ,
	Form ,
	Input ,
	Radio ,
	Table,
	Segmented ,
	Select ,
	Space ,
	InputNumber
} from 'antd';

import { reaxper  } from 'reaxes-react';
import less from './index.module.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
