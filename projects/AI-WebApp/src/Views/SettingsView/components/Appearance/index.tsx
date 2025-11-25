export const RCAppearancePanel = reaxper(() => {
	const {
		store:{UIControls:{global_proxy:store}},
		setState:{UIControls:{global_proxy:setState}}
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
	InputNumber
} from 'antd';
import { reaxper  } from 'reaxes-react';
// import less from './index.module.less';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
