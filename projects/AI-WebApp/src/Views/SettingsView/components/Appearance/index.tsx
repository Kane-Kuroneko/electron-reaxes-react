export const RCAppearancePanel = reaxper(() => {
	const {
		store:{UIControls:{appearance:store}},
		setState:{UIControls:{appearance:setState}}
	} = reaxel_SettingsView;
	
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
					onChange={ value => setState( { language : value } ) }
					options={[
						{ value : 'en-US' , label : 'English' },
						{ value : 'zh-CN' , label : '简体中文' },
						{ value : 'zh-TW' , label : '正體中文' },
						{ value : 'ja-JP' , label : '日本語' },
						{ value : 'ko-KR' , label : '한국어' },
						{ value : 'ru-RU' , label : 'Русский' },
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
