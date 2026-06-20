/**
 * @description FocusMonitor 类型定义
 * AI 视图焦点窃取运行时检测的类型系统
 */

export namespace FocusMonitor {

	/**
	 * 单个视图的焦点状态
	 * 由 ai-page-preload-focus.ts 在 preload 上下文中维护
	 */
	export interface FocusState {
		/** 该视图是否有活动焦点元素 */
		hasFocusedElement: boolean;
		/** 活动元素详情（如果有） */
		activeElement: FocusElement | null;
		/** 上次焦点变化的时间戳 */
		lastFocusChange: number;
		/** 本报告的生成时间戳 */
		reportedAt: number;
	}

	/**
	 * 渲染进程中的活动焦点元素信息
	 */
	export interface FocusElement {
		tagName: string;
		type: string | null;			// input[type]
		role: string | null;			// ARIA role
		isContentEditable: boolean;
		selector: string;				// CSS 选择器近似
	}

	/**
	 * 主进程记录的焦点调用事件
	 */
	export interface FocusCallRecord {
		ts: number;
		source: FocusCallSource;
		currentViewId: string;
		callingViewId: string | null;
		isCrossView: boolean;
		wasCurrentViewFocusedOnEntry: boolean;
		hadActiveInput: boolean;
		activeElementBefore: FocusElement | null;
		activeElementAfter: FocusElement | null;
		wasFocusStolen: boolean;
		stack: string;
		message: string;
	}

	/**
	 * 焦点调用来源
	 */
	export type FocusCallSource =
		| 'did-stop-loading'
		| 'did-fail-load'
		| 'apply-visibility'
		| 'focus-current-content-view'
		| 'prompt-view-open'
		| 'prompt-view-close'
		| 'explicit'
		| 'unknown';

	/**
	 * FocusMonitor 配置
	 */
	export interface FocusMonitorConfig {
		enabled: boolean;
		logDir?: string;
		pollOnBeforeAfter: boolean;
		stackTraceOnCall: boolean;
	}

}
