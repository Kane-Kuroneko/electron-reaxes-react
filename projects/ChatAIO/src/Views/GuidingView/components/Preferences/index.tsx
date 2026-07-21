export const RCPreferencesPage = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		getLanguageOptions ,
		getResolvedTheme ,
		setLanguage ,
		setTheme,
	} = reaxel_GuidingView();
	
	return <section className="guiding-page">
		<div className="guiding-controls">
			<Form layout="vertical">
				<Form.Item label={<I18n>Language</I18n>}>
					<Select
						value={ store.UIControls.appearance.language }
						onChange={ setLanguage }
						options={ getLanguageOptions() }
						optionRender={ option => renderLanguageOption( option , store.Environment.systemLanguageName ) }
						labelRender={ item => renderLanguageSelectedLabel( item , store.Environment.systemLanguageName ) }
					/>
				</Form.Item>
			</Form>
			<Form layout="vertical">
				<Form.Item label={<I18n>Theme</I18n>}>
					<Radio.Group
						value={ store.UIControls.appearance.theme }
						onChange={ event => setTheme( event.target.value ) }
					>
						<Radio.Button value="system"><I18n>Follow System</I18n>( { reaxel_GuidingView.store.Environment.systemTheme } )</Radio.Button>
						<Radio.Button value="light"><I18n>Light</I18n></Radio.Button>
						<Radio.Button value="dark"><I18n>Dark</I18n></Radio.Button>
					</Radio.Group>
				</Form.Item>
			</Form>
		</div>
		<div className="intro-grid">
			{ introItems.map( item => <article
				key={ item.title }
				className="intro-item"
			>
				<h2><I18n>{ item.title }</I18n></h2>
				<p><I18n>{ item.body }</I18n></p>
			</article> ) }
		</div>
	</section>;
} );

const renderLanguageOption = (
	option:any ,
	systemLanguageName:string,
) => {
	if( option.data.value === 'follow-system' ) {
		return <span>
			<I18n>Follow System</I18n>
			<br />
			<span className="select-option-subtitle">{ systemLanguageName }</span>
		</span>;
	}
	return option.data.label;
};

const renderLanguageSelectedLabel = (
	item:any ,
	systemLanguageName:string,
) => {
	if( item.value === 'follow-system' ) {
		return <span><I18n>Follow System</I18n> ({ systemLanguageName })</span>;
	}
	return item.label ?? String( item.value );
};

const introItems = [
	{
		title : 'One shell for multiple AIs' ,
		body : 'Keep common AI services in one Electron host and switch by your configured order instead of scattered browser tabs.',
	} ,
	{
		title : 'Isolated AI sessions' ,
		body : 'Each AI page uses a stable partition for login state, proxy behavior, and storage isolation.',
	} ,
	{
		title : 'Network policy per page' ,
		body : 'Use global proxy defaults, per-AI overrides, system proxy, or direct mode depending on your network.',
	} ,
	{
		title : 'Local-first runtime' ,
		body : 'Settings live in the local userData directory, while menu, tray, and quick switching sync with the main process.',
	},
] as const;

import { reaxel_GuidingView } from '#GuidingView/reaxels/guiding-view';
import { I18n } from '#GuidingView/reaxels/exports';
import {
	Form ,
	Radio ,
	Select,
} from 'antd';
import { reaxper } from 'reaxes-react';
