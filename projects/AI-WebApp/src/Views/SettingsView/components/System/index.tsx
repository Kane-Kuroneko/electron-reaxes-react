export const RCSystemPanel = reaxper(() => {
	const {
		store:{UIControls:{system:store}},
		setState:{UIControls:{system:setState}}
	} = reaxel_SettingsView;
	
	const { Item } = Form;
	return <div>
		<Space direction="vertical">
			<Checkbox
				checked={store.gpu_acceleration}
				onChange={e=>setState({gpu_acceleration:e.target.checked})}
				style={{userSelect:'none'}}
			>
				GPU Acceleration
			</Checkbox>
			<Checkbox
				checked={store.tray}
				onChange={e=>setState({tray : e.target.checked})}
				style={{userSelect:'none'}}
			>
				Exit to Tray
			</Checkbox>
		</Space>
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
