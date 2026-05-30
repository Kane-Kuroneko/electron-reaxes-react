export const RCGeneralPanel = reaxper(() => {
	const {
		store:{UIControls:{appearance:appearanceStore, system:systemStore}},
		setState:{UIControls:{appearance:setAppearance, system:setSystem}}
	} = reaxel_SettingsView;
	
	const handleLanguageChange = (value: Appearance.Language) => {
		setAppearance({ language: value });
		// 仅更新渲染进程 i18n（即时预览），主进程 Menu/Tray 在 Apply/Save 时才变更
		reaxel_I18n().setLanguage(value as any);
	};
	
	return <div className="settings-section">
		{/* Language */}
		<div className="section-title"><I18n>Language</I18n></div>
		<Form layout="vertical">
			<Form.Item>
				<Select
					value={ appearanceStore.language }
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
		
		{/* Appearance */}
		<div className="section-title"><I18n>Appearance</I18n></div>
		<Form layout="vertical">
			<Form.Item label={<I18n>Dark Mode</I18n>}>
				<Radio.Group
					value={ appearanceStore.darkmode }
					onChange={ e => setAppearance( { darkmode : e.target.value } ) }
					style={ { userSelect : 'none' } }
				>
					<Radio value={false}><I18n>Light</I18n></Radio>
					<Radio value={true}><I18n>Dark</I18n></Radio>
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

import { reaxel_SettingsView } from "#src/Views/SettingsView/reaxels/settings-view";
import { reaxel_I18n } from "#src/Views/SettingsView/reaxels/i18n";
import {
	Checkbox ,
	Form ,
	Radio ,
	Select ,
	Space ,
} from 'antd';
import { reaxper } from 'reaxes-react';
import { Appearance } from "#src/Types/SettingsTypes/Appearance";
