export namespace FloatingView {
	export type SwitchAiBarDirection = 'next' | 'previous';

	export type SwitchAiBarItemPosition = 'far-prev' | 'near-prev' | 'current' | 'near-next' | 'far-next';

	export type SwitchAiBarItem = {
		id: string;
		label: string;
		family: AI.AIFamily;
		position: SwitchAiBarItemPosition;
	};

	export type SwitchAiBarPayload = {
		direction: SwitchAiBarDirection;
		items: SwitchAiBarItem[];
		currentId: string;
		sequence: number;
		total: number;
	};

	export type GlobalMessagePayload = {
		type: 'success' | 'info' | 'warning' | 'error';
		content: string;
		duration?: number;
	};

	export type Command =
		| {
			type: 'switch-ai-bar:show';
			payload: SwitchAiBarPayload;
		}
		| {
			type: 'switch-ai-bar:hide';
		}
		| {
			type: 'global-message:show';
			payload: GlobalMessagePayload;
		};
}

import type { AI } from './SettingsTypes/AI';
