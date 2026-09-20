export const RCPreferencesPage = reaxper( () => {
	const { store } = reaxel_GuidingView;
	const {
		getLanguageOptions ,
		setLanguage ,
		setTheme,
	} = reaxel_GuidingView();
	
	return <section className="guiding-page">
		<div className="guiding-controls space-y-6">
			<div className="space-y-2">
				<div className="text-sm font-medium"><I18n>Language</I18n></div>
				<SimpleSelect
					value={ store.UIControls.appearance.language }
					onValueChange={ value => setLanguage( value as Appearance.Language ) }
					options={ getLanguageOptions() }
				/>
			</div>
			<div className="space-y-2">
				<div className="text-sm font-medium"><I18n>Theme</I18n></div>
				<ThemePicker
					value={ store.UIControls.appearance.theme }
					systemTheme={ store.Environment.systemTheme }
					onChange={ setTheme }
					labels={ {
						light : <I18n>Light</I18n> ,
						dark : <I18n>Dark</I18n> ,
						followSystem : <I18n>Follow System</I18n>,
					} }
				/>
			</div>
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
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import { SimpleSelect } from '#Views/shared/ui/select';
import { ThemePicker } from '#Views/shared/ui/theme-picker';
import { reaxper } from 'reaxes-react';
