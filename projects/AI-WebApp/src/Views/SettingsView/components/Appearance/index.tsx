export const RCAppearancePanel = reaxper(() => {
	const {
		store:{UIControls:{appearance:store}},
		setState:{UIControls:{appearance:setState}}
	} = reaxel_SettingsView;
	
	const { Item } = Form;
	return <div>
		<Item label="Dark Mode">
			<Radio.Group
				value={ store.darkmode }
				onChange={ e => setState( { darkmode : e.target.value } ) }
				style={ { userSelect : 'none' } }
			>
				<Radio value={false}>Light</Radio>
				<Radio value={true}>Dark</Radio>
			</Radio.Group>
		</Item>
		<Item label="Language">
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
		</Item>
		<Divider/>
	</div>;
});

import {
	Form ,
	Radio ,
	Select ,
	Divider,
} from 'antd';
import { reaxper } from 'reaxes-react';
import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
