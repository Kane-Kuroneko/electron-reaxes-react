export type AIPageEnvironment = {
	language: Languages;
	languages: string[];
	theme: 'light' | 'dark';
	themeSource: Appearance.Theme;
	backgroundColor: string;
	acceptLanguages: string;
	browserIdentityMode?: 'default' | 'google-ai-studio';
	browserUserAgent?: string | null;
};

import type { Languages } from '#src/Types/Languages';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
