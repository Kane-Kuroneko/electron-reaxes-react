/**
 * @description AI 页面 Preload 焦点状态追踪器
 *
 * 在 ai-page-preload 上下文中运行，通过监听 focusin/focusout 事件
 * 追踪当前 AI 页面的焦点状态（是否有活动输入元素），并通过同步 IPC
 * 暴露给主进程 FocusMonitor 使用。
 *
 * 此模块在 preload 脚本中初始化，对远程 AI 页面零侵入，
 * 仅通过事件监听收集焦点信息。
 */

export interface FocusElement {
	tagName: string;
	type: string | null;
	role: string | null;
	isContentEditable: boolean;
	selector: string;
}

export interface FocusState {
	hasFocusedElement: boolean;
	activeElement: FocusElement | null;
	lastFocusChange: number;
	reportedAt: number;
}

let currentState: FocusState = {
	hasFocusedElement: false,
	activeElement: null,
	lastFocusChange: 0,
	reportedAt: 0,
};

let onStateChange: ((state: FocusState) => void) | null = null;

/**
 * 获取当前元素的选择器近似值
 */
function getElementSelector(el: Element): string {
	const tag = el.tagName.toLowerCase();
	const id = el.id ? `#${ el.id }` : '';
	const cls = Array.from( el.classList )
		.filter( c => !c.startsWith( 'chataio' ) && !c.startsWith( '_' ) )
		.slice( 0, 3 )
		.map( c => `.${ c }` )
		.join( '' );

	if( id ) return `${ tag }${ id }`;
	if( cls ) return `${ tag }${ cls }`;

	const parent = el.parentElement;
	if( parent && parent !== document.body ) {
		const parentSel = getElementSelector( parent );
		const idx = Array.from( parent.children ).indexOf( el );
		return `${ parentSel } > ${ tag }:nth-child(${ idx + 1 })`;
	}

	return tag;
}

/**
 * 提取焦点元素的信息
 */
function extractFocusElement(el: Element): FocusElement {
	const htmlEl = el as HTMLElement;
	return {
		tagName: el.tagName.toLowerCase(),
		type: el.getAttribute( 'type' ),
		role: el.getAttribute( 'role' ),
		isContentEditable: htmlEl.isContentEditable ?? false,
		selector: getElementSelector( el ),
	};
}

/**
 * 发布状态变更
 */
function publishState(): void {
	currentState.reportedAt = Date.now();
	onStateChange?.( {
		hasFocusedElement: currentState.hasFocusedElement,
		activeElement: currentState.activeElement
			? { ...currentState.activeElement }
			: null,
		lastFocusChange: currentState.lastFocusChange,
		reportedAt: currentState.reportedAt,
	} );
}

/**
 * 处理 focusin 事件
 */
function handleFocusIn(event: FocusEvent): void {
	const target = event.target as Element;
	if( !target || target === document.body || target === document.documentElement ) {
		return;
	}

	currentState = {
		hasFocusedElement: true,
		activeElement: extractFocusElement( target ),
		lastFocusChange: Date.now(),
		reportedAt: Date.now(),
	};
	publishState();
}

/**
 * 处理 focusout 事件 — 注意 focusout 在新的焦点元素确定前触发。
 * relatedTarget 非 null 表示焦点在同一文档内移动，让后续的 focusin 覆盖。
 */
function handleFocusOut(event: FocusEvent): void {
	const relatedTarget = event.relatedTarget as Element | null;

	if( relatedTarget ) {
		return;
	}

	currentState = {
		hasFocusedElement: false,
		activeElement: null,
		lastFocusChange: Date.now(),
		reportedAt: Date.now(),
	};
	publishState();
}

/**
 * 初始化焦点追踪器
 * @param onPush 可选的焦点状态推送回调（例如发送 IPC 消息到主进程）
 */
export function initFocusTracker(onPush?: (state: FocusState) => void): void {
	if( typeof document === 'undefined' ) return;

	if( onPush ) {
		onStateChange = onPush;
	}

	document.addEventListener( 'focusin', handleFocusIn, true );
	document.addEventListener( 'focusout', handleFocusOut, true );
}

/**
 * 获取当前焦点状态（由同步 IPC handler 调用）
 */
export function getFocusState(): FocusState {
	currentState.reportedAt = Date.now();
	return {
		hasFocusedElement: currentState.hasFocusedElement,
		activeElement: currentState.activeElement
			? { ...currentState.activeElement }
			: null,
		lastFocusChange: currentState.lastFocusChange,
		reportedAt: currentState.reportedAt,
	};
}
