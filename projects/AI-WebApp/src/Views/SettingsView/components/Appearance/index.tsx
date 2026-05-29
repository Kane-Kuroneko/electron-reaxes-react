export const RCAppearancePanel = reaxper(() => {
	const {
		store:{UIControls:{appearance:store}},
		setState:{UIControls:{appearance:setState}}
	} = reaxel_SettingsView;
	
	const handleLanguageChange = (value: string) => {
		setState({ language: value });
		// 立即通知主进程语言变更，使Menu/Tray实时响应
		api.languageChange(value);
		// 更新渲染进程的 i18n
		reaxel_I18n().setLanguage(value as any);
	};
	
	return <div className="settings-section">
		<div className="section-title">Appearance</div>
		<Form layout="vertical">
			<Form.Item label="Dark Mode">
				<Radio.Group
					value={ store.darkmode }
					onChange={ e => setState( { darkmode : e.target.value } ) }
					style={ { userSelect : 'none' } }
				>
					<Radio value={false}>Light</Radio>
					<Radio value={true}>Dark</Radio>
				</Radio.Group>
			</Form.Item>
			<Form.Item label="Language">
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
