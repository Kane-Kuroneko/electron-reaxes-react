export const RCAppearancePanel = reaxper(() => {
	const {
		store:{UIControls:{networks:store}},
		setState:{UIControls:{networks:setState}}
	} = reaxel_SettingsView;
	
	const { Item } = Form;
	return <div>
		<Item label="Night light">
			<Radio.Group>
				<Radio value={false}>Dsiable</Radio>
				<Radio value={true} >Enable</Radio>
				<Radio value={[]} >Schedule night light</Radio>
			</Radio.Group>
			
			<Item label="Select time range">
				
			</Item>
		</Item>
		<Item label="Language">
			<Space>
				<Select
					options={[
						{
							value : 'Auto',
							label:'Follow System'
						},
						{
							value : 'en-US',
							label:'English'
						},
						{
							value : 'zh-CN',
							label:'简体中文'
						},
						{
							value : 'zh-TW',
							label:'正體中文'
						},
					]}
					style={{minWidth : '200px'}}
				/>
				<Button>Apply</Button>
			</Space>
		</Item>
		<Divider/>
	</div>;
});

import {
	TimePicker,
	Checkbox ,
	Form ,
	Input ,
	Radio ,
	Segmented ,
	Select ,
	Space ,
	Divider,
	InputNumber,
    Button
} from 'antd';
import { reaxper  } from 'reaxes-react';
// import less from './index.module.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
