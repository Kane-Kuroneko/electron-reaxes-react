declare global{
	export const api : API;
	
	interface Window {
		api: API;
	}
	
	export const I18n: typeof import('#SettingsView/reaxels/exports')['I18n'];
	export const i18n : typeof import('#SettingsView/reaxels/exports')['i18n'];
}

export {};

import { API } from '#src/preload';
