export type RendererI18nLanguageConfig = {
	language : string;
	name : string;
	isSource ?: true;
	resourceLoader ?: () => Promise<{ [key: string]: string }>;
};

/**
 * Shared factory for View-process Refaxel_I18n setups.
 * Electron skips localStorage persistence (single source is user-settings.json).
 */
export const createRendererI18nReaxel = (
	languages: RendererI18nLanguageConfig[] ,
) => {
	return reaxel( () => {
		let i18n = Refaxel_I18n( languages as any );
		
		if( !isElectron ) {
			i18n = rehance_I18n_Persist( {} )( i18n );
		}
		
		const rtn = {
			get setLanguage() {
				return i18n().setLanguage;
			} ,
			get i18n() {
				return i18n().i18n;
			} ,
			get language() {
				return i18n().language;
			} ,
		};
		
		return Object.assign( () => rtn , {
			store : i18n.store ,
			setState : i18n.setState ,
			mutate : i18n.mutate ,
			statics : {
				...i18n.statics ,
			} ,
		} );
	} );
};

const isElectron = typeof window !== 'undefined' && !!window.api;

import { Refaxel_I18n } from '#generics/refaxels/i18n';
import { rehance_I18n_Persist } from '#generics/refaxels/i18n/rehancers/storage';
import { reaxel } from 'reaxes';
