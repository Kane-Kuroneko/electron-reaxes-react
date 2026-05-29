export const RCSystemPanel = reaxper(() => {
	const {
		store:{UIControls:{system:store}},
		setState:{UIControls:{system:setState}}
	} = reaxel_SettingsView;
	
	return <div className="settings-section">
		<div className="section-title"><I18n>System</I18n></div>
		<Space direction="vertical" size={ 12 }>
			<Checkbox
				checked={store.gpu_acceleration}
				onChange={e=>setState({gpu_acceleration:e.target.checked})}
				style={{userSelect:'none'}}
			>
				<I18n>GPU Acceleration</I18n>
			</Checkbox>
			<Checkbox
				checked={store.tray}
				onChange={e=>setState({tray : e.target.checked})}
				style={{userSelect:'none'}}
			>
				<I18n>Exit to Tray</I18n>
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
