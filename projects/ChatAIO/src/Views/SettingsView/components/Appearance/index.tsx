export const RCAppearancePanel = reaxper(() => {
	const {
		store:{UIControls:{appearance:store}, Environment:environmentStore},
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
		<div className="section-title"><I18n>Appearance</I18n></div>
		<Form layout="vertical">
			<Form.Item label={<I18n>Theme</I18n>}>
				<Radio.Group
					value={ store.theme }
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
			<Form.Item label={<I18n>Language</I18n>}>
				<RCLanguageSelect
					value={ store.language }
					onChange={ handleLanguageChange }
					systemLanguage={ environmentStore.systemLanguage }
				/>
			</Form.Item>
		</Form>
	</div>;
});

import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import { RCLanguageSelect } from '#SettingsView/components/LanguageSelect';
import {
	Form ,
	Radio ,
} from 'antd';
import { reaxper } from 'reaxes-react';
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
