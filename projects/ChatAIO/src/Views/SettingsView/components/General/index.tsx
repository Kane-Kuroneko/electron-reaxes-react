export const RCGeneralPanel = reaxper(() => {
	const {
		store:{UIControls:{appearance:appearanceStore, system:systemStore}, Environment:environmentStore},
		setState:{UIControls:{system:setSystem}}
	} = reaxel_SettingsView;
	const {
		setLanguage ,
		setTheme,
	} = reaxel_SettingsView();

	const handleLanguageChange = (value: Appearance.Language) => {
		setLanguage( value );
	};

	const handleThemeChange = (value: Appearance.Theme) => {
		void setTheme( value );
	};
	
	return <div className="settings-section">
		{/* Language */}
		<div className="section-title"><I18n>Language</I18n></div>
		<Form layout="vertical">
			<Form.Item>
				<RCLanguageSelect
					value={ appearanceStore.language }
					onChange={ handleLanguageChange }
					systemLanguage={ environmentStore.systemLanguage }
				/>
			</Form.Item>
		</Form>
		
		{/* Appearance */}
		<div className="section-title"><I18n>Appearance</I18n></div>
		<Form layout="vertical">
			<Form.Item label={<I18n>Theme</I18n>}>
				<Radio.Group
					value={ appearanceStore.theme }
					onChange={ e => handleThemeChange( e.target.value ) }
					className="settings-theme-radio-group"
					style={ { userSelect : 'none' } }
				>
					<Radio value="system">
						<I18n>Follow System</I18n>
						<br />
						<span className="select-option-subtitle"><I18n>{ environmentStore.systemTheme === 'dark' ? 'Dark' : 'Light' }</I18n></span>
					</Radio>
					<Radio value="light"><I18n>Light</I18n></Radio>
					<Radio value="dark"><I18n>Dark</I18n></Radio>
				</Radio.Group>
			</Form.Item>
		</Form>
		
		{/* System */}
		<div className="section-title"><I18n>System</I18n></div>
		<Space direction="vertical" size={ 12 }>
			<Checkbox
				checked={systemStore.gpu_acceleration}
				onChange={e=>setSystem({gpu_acceleration:e.target.checked})}
				style={{userSelect:'none'}}
			>
				<I18n>GPU Acceleration</I18n>
			</Checkbox>
			<div>
				<Checkbox
					checked={systemStore.show_tray}
					onChange={e => {
						const checked = e.target.checked;
						setSystem({
							show_tray : checked ,
							close_to_tray : checked ? systemStore.close_to_tray : false,
						});
					}}
					style={{userSelect:'none'}}
				>
					<I18n>Show Tray</I18n>
				</Checkbox>
				{ systemStore.show_tray && (
					<div style={{ marginLeft: 24, marginTop: 8 }}>
						<Checkbox
							checked={systemStore.close_to_tray}
							onChange={e=>setSystem({close_to_tray:e.target.checked})}
							style={{userSelect:'none'}}
						>
							<I18n>Close to Tray</I18n>
						</Checkbox>
					</div>
				) }
			</div>
		</Space>
	</div>;
});

import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import { RCLanguageSelect } from '#SettingsView/components/LanguageSelect';
import {
	Checkbox ,
	Form ,
	Radio ,
	Space ,
} from 'antd';
import { reaxper } from 'reaxes-react';
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
