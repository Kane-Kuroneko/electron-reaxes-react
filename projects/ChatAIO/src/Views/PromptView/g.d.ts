declare global {
	export const api: API;
	
	interface Window {
		api: API;
	}
}

export {};

import { API } from '#src/preload';
