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
		/** custom family 的 favicon / 首字母来源；内置 family 用 family 查打包 logo */
		faviconUrl?: string | null;
		url?: string;
	};

	/**
	 * SwitchAiBar 显示载荷。
	 * items 为当前这份卡片列表，activeIndex 是目标下标。
	 * show 只用于顺序一格：direction 决定 slideNext / slidePrev 一次。
	 * 菜单绝对选中走 prepare（隐藏停靠），不发 show。
	 * 见 docs/issues/floating-view-carousel-absolute-select.md。
	 */
	export type SwitchAiBarPayload = {
		/** 全部活跃 AI（已按用户顺序排列） */
		items: SwitchAiBarItem[];
		/** 当前活跃 AI 在 items 中的索引 */
		activeIndex: number;
		/** 用户切换方向 */
		direction: SwitchAiBarDirection;
		/** 性能记录上下文 ID（用于关联主进程与渲染进程的 perf 事件） */
		ctxId?: string;
		/**
		 * 列表来源（性能诊断）：
		 * configured=全部活跃配置；instantiated=已打开 runtime；prepare-*=启动预热。
		 */
		source?:
			| 'configured'
			| 'instantiated'
			| 'prepare-instantiated'
			| 'prepare-configured'
			| 'unknown';
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
			/** 启动预热：写入卡片数据并挂载 Swiper，不显示 */
			type: 'switch-ai-bar:prepare';
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
