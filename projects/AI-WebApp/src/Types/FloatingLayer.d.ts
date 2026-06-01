export namespace FloatingLayer {
	export type SwitchAiBarDirection = 'next' | 'previous';

	export type SwitchAiBarItemPosition = 'prev' | 'current' | 'next';

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

	export type Command =
		| {
			type: 'switch-ai-bar:show';
			payload: SwitchAiBarPayload;
		}
		| {
			type: 'switch-ai-bar:hide';
		};
}

import type { AI } from './SettingsTypes/AI';
