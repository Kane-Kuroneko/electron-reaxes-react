
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
			const { changeEditAIModalVisible } = reaxel_SettingsView();
			return <div>
				<Space>
					<Button
						type="link"
						onClick={() => {
							changeEditAIModalVisible(true,record.id);
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
					key : it.id
				}
			) ) }
			pagination={ false }
		/>
		<EidtAIModal/>
	</div>;
} );

const EidtAIModal = reaxper( () => {
	const { changeEditAIModalVisible } = reaxel_SettingsView();
	const {edit_AI_modal:store} = reaxel_SettingsView.store.UIControls.manage_AIs;
	const {edit_AI_modal:setState} = reaxel_SettingsView.setState.UIControls.manage_AIs;
	
	const { editing_id,visible,fields } = store;
	
	const initialFields = {
		label:checkAs<string>(null),
		AI_family:checkAs<AI.AIFamily>(null),
		url:checkAs<string>(null),
		proxy:checkAs<NetworkProxy.ProxyConf>(null),
		preloadOnStartup:checkAs<boolean>(false),
	};

	useEffect( () => {
		if(!editing_id){
			setState.fields( initialFields);
		}
	} , [ editing_id ] );
	
	
	const ProxyComponent = {
		'from_server_list' : <SelectProxyServer/>,
		'user_fill' : <UserFillProxy/>,
	}[fields.proxy_mode] ?? null;
	
	// 保存编辑的AI配置
	const handleSave = () => {
		const {mutate} = reaxel_SettingsView;
		
		mutate((state) => {
			const aiIndex = state.Data.AIs.findIndex(ai => ai.id === editing_id);
			if(aiIndex !== -1) {
				// 更新AI配置
				state.Data.AIs[aiIndex] = {
					...state.Data.AIs[aiIndex],
					label: store.fields.label,
					AI_family: store.fields.AI_family,
					url: store.fields.url,
					preloadOnStartup: store.fields.preloadOnStartup,
					proxy_mode: store.fields.proxy_mode,
					from_server_list_proxy: store.fields.from_server_list_proxy,
					user_fill_proxy: store.fields.user_fill_proxy,
				};
				
				// 收集所有需要预加载的AI family并发送到主进程
				const preloadAIFamilies = state.Data.AIs
					.filter(ai => ai.preloadOnStartup === true)
					.map(ai => ai.AI_family);
				
				// 通过IPC发送到主进程保存
				window.api.updatePreloadAIConfig(preloadAIFamilies);
			}
		});
		
		// 关闭modal
		setState({
			visible: false,
			editing_id: null,
		});
	};
	
	return <Modal
		open={ store.visible && editing_id }
		onCancel={ () => {
			setState( {
				visible : false ,
				editing_id : null ,
			} );
		} }
		onOk={handleSave}
		okText="Save"
		cancelText="Cancel"
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
				<Form.Item
					label="Preload on Startup"
					valuePropName="checked"
				>
					<Checkbox
						value={store.fields.preloadOnStartup}
						checked={store.fields.preloadOnStartup ?? false}
						onChange={(e) => {
							setState.fields( {preloadOnStartup : e.target.checked} );
						}}
						style={{userSelect:'none'}}
					>
						Load this AI immediately when app starts
					</Checkbox>
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
