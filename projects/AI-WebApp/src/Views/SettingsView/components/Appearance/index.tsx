export const RCAppearancePanel = reaxper(() => {
	const {
		store:{UIControls:{appearance:store}},
		setState:{UIControls:{appearance:setState}}
	} = reaxel_SettingsView;
	
	const handleLanguageChange = (value: string) => {
		setState({ language: value });
		// 仅更新渲染进程 i18n（即时预览），主进程 Menu/Tray 在 Apply/Save 时才变更
		reaxel_I18n().setLanguage(value as any);
	};
	
	return <div className="settings-section">
		<div className="section-title"><I18n>Appearance</I18n></div>
		<Form layout="vertical">
			<Form.Item label={<I18n>Dark Mode</I18n>}>
				<Radio.Group
					value={ store.darkmode }
					onChange={ e => setState( { darkmode : e.target.value } ) }
					style={ { userSelect : 'none' } }
				>
					<Radio value={false}><I18n>Light</I18n></Radio>
					<Radio value={true}><I18n>Dark</I18n></Radio>
				</Radio.Group>
			</Form.Item>
			<Form.Item label={<I18n>Language</I18n>}>
				<Select
					value={ store.language }
					onChange={ handleLanguageChange }
					options={[
						{ value : 'en-US' , label : 'English' },
						{ value : 'zh-CN' , label : '简体中文' },
						{ value : 'zh-TW' , label : '正體中文' },
						{ value : 'ja-JP' , label : '日本語' },
						{ value : 'ko-KR' , label : '한국어' },
					]}
					style={{minWidth : '200px'}}
				/>
			</Form.Item>
		</Form>
	</div>;
});

import {
	Form ,
	Radio ,
	Select ,
} from 'antd';
import { reaxper } from 'reaxes-react';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { reaxel_I18n } from "#src/Views/SettingsView/reaxels/i18n";
