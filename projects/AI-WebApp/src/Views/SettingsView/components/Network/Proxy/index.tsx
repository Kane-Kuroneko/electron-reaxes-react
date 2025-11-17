export const RCProxyItem = reaxper(() => {
	const {
		store:{UIControls:{global_proxy:store}},
		setState:{UIControls:{global_proxy:setState}}
	} = reaxel_SettingsView;
	const { getSettings } = reaxel_SettingsView();
	
	
	const { Item } = Form;
	return <div>
		<Item
			label="Global Proxy"
		>
			<Radio.Group
				value={ store.userinputs.global_proxy.enabled }
				onChange={ ( e ) => {
					setState.userinputs.global_proxy( {
						enabled : e.target.value ,
					} );
				} }
			>
				<Radio.Button value={ false }>No Proxy</Radio.Button>
				<Radio.Button value={ true }>Modify Proxy</Radio.Button>
			</Radio.Group>
			
			{
				store.userinputs.global_proxy.enabled && <div>
					<Form.Item
						label="Protocol :"
					>
						<Segmented
							defaultValue="http"
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
							variant="filled"
							value={ userInputsStore.proxy }
							placeholder="127.0.0.1"
							onChange={
								( e ) => {
									setUserInputs( {
										proxy : e.target.value ,
									} );
								}
							}
						/>
					</Form.Item>
					<Form.Item
						label="Port number :"
					>
						<Input
							type="number"
							value={ userInputsStore.proxy }
							variant="filled"
							placeholder="7890"
							onChange={
								( e ) => {
									setUserInputs( {
										proxy : e.target.value ,
									} );
								}
							}
						/>
					</Form.Item>
					
					
					<Form.Item
						label={ <label>
							<Space size={ 3 }>
								<Checkbox />
								<span>No proxy for :</span>
							</Space>
						</label> }
					>
						<Select
							disabled={store.UIControls}
							mode="multiple"
							options={[]}
							value={ userInputsStore.no_proxy_for }
						/>
					</Form.Item>
				</div>
			}
		</Item>
	</div>
} )


import {
	Checkbox ,
	Form ,
	Input ,
	Radio ,
	Segmented ,
	Select ,
	Space ,
} from 'antd';
import { reaxper  } from 'reaxes-react';
import './index.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels";
