export namespace FloatingView {
	/** AI 切换方向，对应 Swiper 的 slide 方向 */
	export type SwitchAiBarDirection = 'next' | 'previous';

	/** 卡片在轮播中的视觉位置（仅用于 CSS data-position 属性，不再出现在 payload 中） */
	export type SwitchAiBarItemPosition = 'far-prev' | 'near-prev' | 'current' | 'near-next' | 'far-next';

	/** 单个 AI 卡片的数据（不含 position —— Swiper 根据 activeIndex 决定视觉位置） */
	export type SwitchAiBarItem = {
		id: string;
		label: string;
		family: AI.AIFamily;
	};

	/**
	 * SwitchAiBar 显示载荷。
	 * items 为全部活跃 AI（按用户顺序），activeIndex 指示当前活跃 AI 在 items 中的索引。
	 * direction 告知组件滑动方向，Swiper 据此调用 slideNext() 或 slidePrev()，
	 * 保证"向前 = 卡片永远向左移动、永不跳卡"的 UX 契约。
	 */
	export type SwitchAiBarPayload = {
		/** 全部活跃 AI（已按用户顺序排列） */
		items: SwitchAiBarItem[];
		/** 当前活跃 AI 在 items 中的索引 */
		activeIndex: number;
		/** 用户切换方向 */
		direction: SwitchAiBarDirection;
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
