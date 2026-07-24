/**
 * MainView menubar 视觉几何单一数据源。
 *
 * 契约：barHeight = marginY * 2 + itemHeight = 4 + 28 + 4 = 36（全平台）
 * macOS 勿再单独抬到 42——相对窗口顶边会整体下沉。
 *
 * trafficLightPosition.y = (barHeight - trafficLightSize) / 2
 *
 * Windows/Linux titleBarOverlay：
 * - 自定义可交互内容用 CSS `env(titlebar-area-*)` 收进安全区（padding-inline-end）
 * - overlay `color` 必须与 menubar `--menu-view-bg` 同色，否则关闭按钮区会色差
 */

export const MENU_ITEM_HEIGHT = 28;
export const MENU_BAR_HEIGHT = 36;
export const TRAFFIC_LIGHT_SIZE = 12;
export const TRAFFIC_LIGHT_INSET_X = 12;
export const TRAFFIC_LIGHT_SPACER_WIDTH = 78;

/** 与 MainView/index.less 中 --menu-view-bg 保持同步 */
export const MENUBAR_TITLEBAR_OVERLAY = {
	light : {
		color : '#f5f6f8' ,
		symbolColor : '#5c5c5c' ,
	} ,
	dark : {
		color : '#2d2d30' ,
		symbolColor : '#cccccc' ,
	} ,
} as const;

export const getMenuBarHeight = ():number => MENU_BAR_HEIGHT;

export const getMenuItemMarginY = ():number => {
	return ( MENU_BAR_HEIGHT - MENU_ITEM_HEIGHT ) / 2;
};

export const getTrafficLightPosition = ():{ x:number; y:number } => {
	return {
		x : TRAFFIC_LIGHT_INSET_X ,
		y : ( MENU_BAR_HEIGHT - TRAFFIC_LIGHT_SIZE ) / 2,
	};
};

export const getMenubarTitleBarOverlayOptions = (
	theme : 'light' | 'dark',
):{
	color : string;
	symbolColor : string;
	height : number;
} => {
	const palette = MENUBAR_TITLEBAR_OVERLAY[theme];
	return {
		color : palette.color ,
		symbolColor : palette.symbolColor ,
		height : MENU_BAR_HEIGHT ,
	};
};

/**
 * MainView 根容器的高度与 CSS 变量。两条平台渲染路径（Mac/Windows）共用，
 * 避免各自重复维护几何契约。返回纯对象，组件侧按需 cast 为 React.CSSProperties。
 */
export const getMenuBarRootStyleVars = ():Record<string , string> => {
	return {
		height : `${ MENU_BAR_HEIGHT }px` ,
		'--menu-bar-height' : `${ MENU_BAR_HEIGHT }px` ,
		'--menu-item-height' : `${ MENU_ITEM_HEIGHT }px` ,
		'--menu-item-margin-y' : `${ getMenuItemMarginY() }px` ,
		'--traffic-light-spacer-width' : `${ TRAFFIC_LIGHT_SPACER_WIDTH }px` ,
	};
};
