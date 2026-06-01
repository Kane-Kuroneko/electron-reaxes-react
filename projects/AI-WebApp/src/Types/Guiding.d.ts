export namespace Guiding {
	export type NetworkStatus = 'unknown' | 'direct' | 'blocked';
	
	export type Progress = {
		appearance?: {
			language: Appearance.Language;
			theme: Appearance.Theme;
		};
		network?: {
			status: NetworkStatus;
			canDirectConnect: boolean | null;
		};
		AIs?: AI.AIItem[];
	};
	
	export type Defaults = {
		appearance: {
			language: Appearance.Language;
			resolvedLanguage: Languages;
			theme: Appearance.Theme;
			resolvedTheme: 'light' | 'dark';
		};
		systemLanguageName: string;
		defaultAIs: AI.AIItem[];
	};
	
	export type ConnectivityTargetResult = {
		id: string;
		label: string;
		url: string;
		ok: boolean;
		status?: number;
		error?: string;
		durationMs: number;
	};
	
	export type ConnectivityResult = {
		canDirectConnect: boolean;
		targets: ConnectivityTargetResult[];
	};
	
	export type FinishOptions = {
		openSettings?: boolean;
		skip?: boolean;
		progress?: Progress;
	};
}

import type { Languages } from '#src/Types/Languages';
import type { Appearance } from '#src/Types/SettingsTypes/Appearance';
import type { AI } from '#src/Types/SettingsTypes/AI';
