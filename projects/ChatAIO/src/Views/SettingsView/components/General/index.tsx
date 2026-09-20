export const RCGeneralPanel = reaxper(() => {
	const {
		store:{UIControls:{appearance:appearanceStore, system:systemStore}, Environment:environmentStore},
		setState:{UIControls:{system:setSystem}}
	} = reaxel_SettingsView;
	const {
		setLanguage ,
		setTheme ,
		persistRuntimeSettings,
	} = reaxel_SettingsView();

	const persistSystem = ( patch:Partial<typeof systemStore> ) => {
		setSystem( patch );
		void persistRuntimeSettings();
	};

	return <div className="mx-auto w-full max-w-3xl">
		<SettingsSection
			title={ <I18n>Language</I18n> }
			description={ <I18n>Choose how ChatAIO displays menus and Settings.</I18n> }
		>
			<SettingsRow title={ <I18n>Display language</I18n> }>
				<RCLanguageSelect
					value={ appearanceStore.language }
					onChange={ setLanguage }
					systemLanguage={ environmentStore.systemLanguage }
				/>
			</SettingsRow>
		</SettingsSection>

		<SettingsSection
			title={ <I18n>Appearance</I18n> }
			description={ <I18n>Light, dark, or follow the system. Changes apply immediately.</I18n> }
		>
			<SettingsRow title={ <I18n>Theme</I18n> }>
				<ThemePicker
					value={ appearanceStore.theme }
					systemTheme={ environmentStore.systemTheme }
					onChange={ ( value ) => {
						void setTheme( value );
					} }
				/>
			</SettingsRow>
		</SettingsSection>

		<SettingsSection
			title={ <I18n>System</I18n> }
			description={ <I18n>Window behavior and hardware. GPU changes need a restart.</I18n> }
		>
			<SettingsRow
				title={ <I18n>GPU Acceleration</I18n> }
				description={ <I18n>Use the GPU for smoother pages. Requires restarting ChatAIO.</I18n> }
			>
				<Switch
					checked={ systemStore.gpu_acceleration }
					onCheckedChange={ ( checked ) => persistSystem( { gpu_acceleration : checked } ) }
				/>
			</SettingsRow>
			<SettingsRow
				title={ <I18n>Show Tray</I18n> }
				description={ <I18n>Keep ChatAIO in the system tray.</I18n> }
			>
				<Switch
					checked={ systemStore.show_tray }
					onCheckedChange={ ( checked ) => persistSystem( {
						show_tray : checked ,
						close_to_tray : checked ? systemStore.close_to_tray : false,
					} ) }
				/>
			</SettingsRow>
			{ systemStore.show_tray ? <SettingsRow
				title={ <I18n>Close to Tray</I18n> }
				description={ <I18n>Closing the window hides the app instead of quitting.</I18n> }
			>
				<Switch
					checked={ systemStore.close_to_tray }
					onCheckedChange={ ( checked ) => persistSystem( { close_to_tray : checked } ) }
				/>
			</SettingsRow> : null }
		</SettingsSection>
	</div>;
});

import { RCLanguageSelect } from '#SettingsView/components/LanguageSelect';
import { reaxel_SettingsView } from "#SettingsView/reaxels/settings-view";
import { SettingsRow , SettingsSection } from '#Views/shared/ui/settings-row';
import { Switch } from '#Views/shared/ui/switch';
import { ThemePicker } from '#Views/shared/ui/theme-picker';
import { reaxper } from 'reaxes-react';
