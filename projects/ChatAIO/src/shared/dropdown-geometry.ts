/**
 * DropdownView 面板几何单一数据源。
 * 主进程用同一套常量算窗口 bounds / Switch AI 文字 inset；
 * 渲染层通过 getDropdownRootStyleVars() 注入 CSS 变量，禁止在 less 里另写一套魔法数。
 * Current AI badge 对齐：docs/features/menubar-current-ai-dropdown.md
 */

export const DROPDOWN_CHROME = {
	top : 0 ,
	right : 6 ,
	bottom : 8 ,
	left : 6 ,
} as const;

export const DROPDOWN_PANEL_BORDER = 1;
export const DROPDOWN_PANEL_PAD_Y = 4;
export const DROPDOWN_ITEM_PAD_LEFT = 12;
export const DROPDOWN_ITEM_PAD_RIGHT = 4;
export const DROPDOWN_ITEM_GAP = 8;
export const DROPDOWN_CHECKMARK_WIDTH = 16;
export const DROPDOWN_LOAD_DOT_SIZE = 6;
export const DROPDOWN_LOAD_DOT_MARGIN_END = 5;
export const DROPDOWN_SIDE_GUTTER_WIDTH = 16;
export const DROPDOWN_ROW_HEIGHT = 27;
export const DROPDOWN_SEPARATOR_LINE = 1;
export const DROPDOWN_SEPARATOR_MARGIN_Y = 4;

export const DROPDOWN_PANEL_VPAD = DROPDOWN_PANEL_PAD_Y * 2 + DROPDOWN_PANEL_BORDER * 2;
export const DROPDOWN_SEPARATOR_HEIGHT = DROPDOWN_SEPARATOR_LINE + DROPDOWN_SEPARATOR_MARGIN_Y * 2;
export const DROPDOWN_LOAD_DOT_SLOT = DROPDOWN_LOAD_DOT_SIZE + DROPDOWN_LOAD_DOT_MARGIN_END;
export const DROPDOWN_ITEM_EXTRA = DROPDOWN_ITEM_PAD_LEFT
	+ DROPDOWN_ITEM_PAD_RIGHT
	+ DROPDOWN_CHECKMARK_WIDTH
	+ DROPDOWN_ITEM_GAP
	+ DROPDOWN_SIDE_GUTTER_WIDTH;

/**
 * panel 左缘（含 border）到 Switch AI `.menu-item__label` 左缘。
 * 行结构：border | pad | checkmark | gap | load-dot+margin | gap | label
 */
export const getSwitchAiLabelInset = (): number => {
	return DROPDOWN_PANEL_BORDER
		+ DROPDOWN_ITEM_PAD_LEFT
		+ DROPDOWN_CHECKMARK_WIDTH
		+ DROPDOWN_ITEM_GAP
		+ DROPDOWN_LOAD_DOT_SLOT
		+ DROPDOWN_ITEM_GAP;
};

export const getDropdownRootStyleVars = (): Record<string , string> => {
	return {
		'--dropdown-chrome-top' : `${ DROPDOWN_CHROME.top }px` ,
		'--dropdown-chrome-right' : `${ DROPDOWN_CHROME.right }px` ,
		'--dropdown-chrome-bottom' : `${ DROPDOWN_CHROME.bottom }px` ,
		'--dropdown-chrome-left' : `${ DROPDOWN_CHROME.left }px` ,
		'--dropdown-panel-border' : `${ DROPDOWN_PANEL_BORDER }px` ,
		'--dropdown-panel-pad-y' : `${ DROPDOWN_PANEL_PAD_Y }px` ,
		'--dropdown-item-pad-left' : `${ DROPDOWN_ITEM_PAD_LEFT }px` ,
		'--dropdown-item-pad-right' : `${ DROPDOWN_ITEM_PAD_RIGHT }px` ,
		'--dropdown-item-gap' : `${ DROPDOWN_ITEM_GAP }px` ,
		'--dropdown-checkmark-width' : `${ DROPDOWN_CHECKMARK_WIDTH }px` ,
		'--dropdown-load-dot-size' : `${ DROPDOWN_LOAD_DOT_SIZE }px` ,
		'--dropdown-load-dot-margin-end' : `${ DROPDOWN_LOAD_DOT_MARGIN_END }px` ,
		'--dropdown-side-gutter-width' : `${ DROPDOWN_SIDE_GUTTER_WIDTH }px` ,
		'--dropdown-row-height' : `${ DROPDOWN_ROW_HEIGHT }px` ,
		'--dropdown-separator-line' : `${ DROPDOWN_SEPARATOR_LINE }px` ,
		'--dropdown-separator-margin-y' : `${ DROPDOWN_SEPARATOR_MARGIN_Y }px` ,
	};
};
