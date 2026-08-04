export type AIPageEnvironment = {
	language: Languages;
	languages: string[];
	theme: 'light' | 'dark';
	themeSource: Appearance.Theme;
	backgroundColor: string;
	acceptLanguages: string;
	browserIdentityMode?: 'default' | 'google-ai-studio';
	browserUserAgent?: string | null;
	/** Chromium full version for main-world Google Chrome brand patches (AI Studio). */
	chromeVersionFull?: string;
};

import type { Languages } from '#src/Types/Languages';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
