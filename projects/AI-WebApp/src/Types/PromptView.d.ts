export namespace PromptView {
	export type Side = 'left' | 'right';

	export type Item = {
		id: string;
		content: string;
		createdAt: number;
		updatedAt: number;
	};

	export type Appearance = {
		theme: SettingsAppearance.Theme;
		language: SettingsAppearance.Language;
	};

	export type Environment = {
		systemLanguage: Languages;
		systemTheme: 'light' | 'dark';
	};

	export type State = {
		side: Side;
		items: Item[];
		appearance: Appearance;
		environment: Environment;
	};

	export type SaveResult = {
		success: boolean;
		items: Item[];
		error?: string;
	};

	export type CopyResult = {
		success: boolean;
		error?: string;
	};
}

import type { Languages } from '#src/Types/Languages';
import type { Appearance as SettingsAppearance } from '#src/Types/SettingsTypes/Appearance';
