/**
 * About Panel - 开发者与应用信息
 */
export const RCAboutPanel = reaxper( () => {
	return <div className="settings-section">
		<div className="section-title"><I18n>About</I18n></div>
		<Descriptions
			column={ 1 }
			size="small"
			bordered
			labelStyle={ {
				fontWeight : 500 ,
				width : 140 ,
				whiteSpace : 'nowrap',
			} }
			contentStyle={ { wordBreak : 'break-all' } }
		>
			<Descriptions.Item label={<I18n>Application</I18n>}>
				AI-WebApp
			</Descriptions.Item>
			<Descriptions.Item label={<I18n>Version</I18n>}>
				1.0.0
			</Descriptions.Item>
			<Descriptions.Item label={<I18n>Description</I18n>}>
				<I18n>Unified desktop client for multiple AI services</I18n>
			</Descriptions.Item>
			<Descriptions.Item label={<I18n>Developer</I18n>}>
				Kuroneko
			</Descriptions.Item>
			<Descriptions.Item label={<I18n>Tech Stack</I18n>}>
				Electron &middot; React &middot; Reaxes &middot; Ant Design &middot; TypeScript
			</Descriptions.Item>
			<Descriptions.Item label={<I18n>License</I18n>}>
				WTFPL
			</Descriptions.Item>
		</Descriptions>
	</div>;
} );

import { reaxper } from 'reaxes-react';
import { Descriptions } from 'antd';
import { I18n } from '#src/Views/SettingsView/reaxels/exports';

