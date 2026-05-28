export const RCSystemPanel = reaxper(() => {
	const {
		store:{UIControls:{system:store}},
		setState:{UIControls:{system:setState}}
	} = reaxel_SettingsView;
	
	return <div className="settings-section">
		<div className="section-title">System</div>
		<Space direction="vertical" size={ 12 }>
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
	</div>;
});


import {
	Checkbox ,
	Space ,
} from 'antd';
import { reaxper  } from 'reaxes-react';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
