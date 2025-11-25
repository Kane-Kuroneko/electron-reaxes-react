export const RCProxyItem = reaxper(() => {
	const {
		store:{UIControls:{global_proxy:store}},
		setState:{UIControls:{global_proxy:setState}}
	} = reaxel_SettingsView;
	
	const { Item } = Form;
	return <div className={less.globalProxy}>
		<Item
			label="Global Proxy"
		>
			<Radio.Group
				value={ store.enabled }
				onChange={ ( e ) => {
					setState( {
						enabled : e.target.value ,
					} );
				} }
				style={{userSelect:'none'}}
			>
				<Radio.Button value={ false }>No Proxy</Radio.Button>
				<Radio.Button value={ true }>Modify Proxy</Radio.Button>
			</Radio.Group>
			
			{
				store.enabled && <div>
					<Form.Item
						label="Protocol :"
					>
						<Segmented
							style={{userSelect:'none'}}
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
						layout="vertical"
					>
						<Input
							variant="underlined"
							value={ store.hostname }
							placeholder="127.0.0.1"
							onChange={
								( e ) => {
									setState( {
										hostname : e.target.value ,
									} );
								}
							}
						/>
					</Form.Item>
					<Form.Item
						label="Port number :"
					>
						<InputNumber
							value={ store.port }
							variant="underlined"
							placeholder="7890"
							onChange={
								( value ) => {
									setState( {
										port : value ,
									} );
								}
							}
						/>
					</Form.Item>
					
					
					<Form.Item
						label={ <label>
							<Space size={ 3 }>
								<Checkbox
									checked={store.no_proxy_for_enabled}
									onChange={ ( e ) => {
										setState( {
											no_proxy_for_enabled : e.target.checked ,
										} );
									} }
								/>
								<span style={{userSelect:'none'}}>No proxy for :</span>
							</Space>
						</label> }
					>
						<Select
							disabled={!store.no_proxy_for_enabled}
							mode="multiple"
							options={[]}
							value={ store.no_proxy_for }
							variant="underlined"
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
	InputNumber
} from 'antd';
import { reaxper  } from 'reaxes-react';
import less from './index.module.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
