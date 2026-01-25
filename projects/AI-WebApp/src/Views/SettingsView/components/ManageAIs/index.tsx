const columns : TableColumnType<AI.AIItem>[] = [
	{
		title : 'Drag to sort' ,
		render() {
			return <DragIconSvg
				style={{fontSize : 40,userSelect : 'none'}}
			/>;
		}
	} ,
	{
		title : 'Enabled' ,
		render(){
			return <Checkbox
				checked={true}
				onChange={() => {
					
				}}
			/>;
		}
	} ,
	{
		title : 'App name' ,
		dataIndex : 'label' ,
	} ,
	{
		title : 'Url' ,
		dataIndex : 'domain' ,
	} ,
	{
		title : 'Operations' ,
		render : ( text , record , index ) => {
			return <div>
				<Space>
					<Button
						type="link"
						onClick={() => {
							reaxel_SettingsView.setState.UIControls.manage_AIs.edit_AI_modal({
								visible : true,
								editing_id : record.id,
								fields : {
									...record,
									from_server_list_proxy : null,
									user_fill_proxy : null,
									proxy_mode : 'follow_global_setting',
								},
							});
						}}
					>Edit</Button>
				</Space>
			</div>;
		}
	} ,
]

export const RCManageAIsPanel = reaxper( () => {
	

	return <div>
		<Table
			columns={ columns }
			dataSource={ reaxel_SettingsView.store.Data.AIs.map( it => (
				{
					...it ,
					key : it.AI_family
				}
			) ) }
			pagination={ false }
		/>
		<EidtAIModal/>
	</div>;
} );

const EidtAIModal = reaxper( () => {

	const {edit_AI_modal:store} = reaxel_SettingsView.store.UIControls.manage_AIs;
	const {edit_AI_modal:setState} = reaxel_SettingsView.setState.UIControls.manage_AIs;
	
	const { editing_id,visible,fields } = store;
	
	const initialFields = {
		label:checkAs<string>(null),
		AI_family:checkAs<AI.AIFamily>(null),
		url:checkAs<string>(null),
		proxy:checkAs<NetworkProxy.ProxyConf>(null),
	};

	useEffect( () => {
		if(!editing_id){
			setState.fields( initialFields);
		}
	} , [ editing_id ] );
	
	const target = reaxel_SettingsView.store.Data.AIs.find( it => it.id === store.editing_id );
	
	const ProxyComponent = {
		'from_server_list' : <SelectProxyServer/>,
		'user_fill' : <UserFillProxy/>,
	}[store.fields.proxy_mode];
	
	console.log(editing_id,target);		
	return <Modal
		open={ store.visible && editing_id }
		onCancel={ () => {
			setState( {
				visible : false ,
				editing_id : null ,
			} );
		} }
	>
		<div>
			<Form
				variant="underlined"
				layout="vertical"
			>
				<Form.Item
					label="App name"
				>
					<Input
						value={store.fields.label}
						onChange={(event) => {
							setState.fields( {label : event.target.value} );
						}}
					/>
				</Form.Item>
				<Form.Item
					label="App family"
				> 
					<Select
						value={store.fields.AI_family}
						onChange={(value) => {
							setState.fields( {AI_family : value} );
						}}
					>
						{
							AIFamily.map( it => (
								<Select.Option
									key={it}
									value={it}
								>
									{it}
								</Select.Option>
							) )
						}
					</Select>
				</Form.Item>
				<Form.Item
					label="App url"
				>
					<Input
						value={store.fields.url}
						onChange={(event) => {
							setState.fields( {url : event.target.value} );
						}}
					/>
				</Form.Item>
				<Form.Item
					label="proxy"
				>
					<Radio.Group
						value={store.fields.proxy_mode}
						onChange={(event) => {
							setState.fields( {proxy_mode : event.target.value} );
						}}
						style={{userSelect:'none'}}
					>
						<Radio value="follow_global_setting">Follow Global Setting</Radio>
						<Radio value="direct">Direct</Radio>
						<Radio value="from_server_list">Select From List</Radio>	
						<Radio value="user_fill">Manual</Radio>	
					</Radio.Group>
					{ProxyComponent}
				</Form.Item>
			</Form>
		</div>
	</Modal>;
} );

export const SelectProxyServer = reaxper( () => {
	
	return <div>
		<Select
			options={ [
				{
					value : 'Auto' ,
					label : 'Follow System',
				},
			] }
		/>
	</div>;
} );

export const UserFillProxy = reaxper( () => {
	const {edit_AI_modal:store} = reaxel_SettingsView.store.UIControls.manage_AIs;
	const {edit_AI_modal:setState} = reaxel_SettingsView.setState.UIControls.manage_AIs;
	
	return <div>
		<Form.Item
			label="Protocol :"
		>
			<Segmented
				style={ { userSelect : 'none' } }
				value={notFalse(store.fields.user_fill_proxy)?.protocol}
				onChange={(e: NetworkProxy.Protocol) => {
					setState.fields( {
						user_fill_proxy : {
							...notFalse( store.fields.user_fill_proxy ) ,
							protocol : e ,
						} ,
					} );
				}}
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
				value={ notFalse(store.fields.user_fill_proxy)?.hostname }
				placeholder="127.0.0.1"
				onChange={ ( e ) => {
					setState.fields( {
						user_fill_proxy : {
							...notFalse( store.fields.user_fill_proxy ) ,
							hostname : e.target.value ,
						} ,
					} );
				}}
			/>
		</Form.Item>
		<Form.Item
			label="Port number :"
			layout="horizontal"
		>
			<InputNumber
				min={0}
				max={65535}
				value={ notFalse(store.fields.user_fill_proxy)?.port }
				placeholder="7890"
				onChange={ ( value ) => {
					setState.fields( {
						user_fill_proxy : {
							...notFalse( store.fields.user_fill_proxy ) ,
							port : value ,
						} ,
					} );
				}}
			/>
		</Form.Item>
	</div>;
} );

import {
	Table ,
	Pagination ,
	Input ,
	Select ,
	Checkbox ,
	InputNumber,
	Form,
	Switch ,
	Segmented,
	Modal,
	Space ,
	Button ,
	TableColumnType,
	Radio,
} from 'antd';
import {} from '@ant-design/icons';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { AI } from "#src/Types/SettingsTypes/AI";
import { DragIconSvg } from "./DragIcon.svg";
import { AIFamily } from "#src/shared/statics/AI-family";
import { NetworkProxy } from "#src/Types/SettingsTypes/NetworkProxy";
