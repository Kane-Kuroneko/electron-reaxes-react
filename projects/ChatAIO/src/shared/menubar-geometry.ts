/**
 * MainView menubar 视觉几何单一数据源。
 *
 * 契约：barHeight = marginY * 2 + itemHeight = 4 + 28 + 4 = 36（全平台）
 * macOS 勿再单独抬到 42——相对窗口顶边会整体下沉。
 *
 * trafficLightPosition.y = (barHeight - trafficLightSize) / 2
 */

export const MENU_ITEM_HEIGHT = 28;
export const MENU_BAR_HEIGHT = 36;
export const TRAFFIC_LIGHT_SIZE = 12;
export const TRAFFIC_LIGHT_INSET_X = 12;
export const TRAFFIC_LIGHT_SPACER_WIDTH = 78;

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
