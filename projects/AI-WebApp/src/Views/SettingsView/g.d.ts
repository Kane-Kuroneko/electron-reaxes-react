declare global{
	export const api : API;
	
	interface Window {
		api: API;
	}
	
	export const I18n: typeof import('./reaxels/exports')['I18n'];
	export const i18n : typeof import('./reaxels/exports')['i18n'];
}

export {};

import { API } from '../../preload';
