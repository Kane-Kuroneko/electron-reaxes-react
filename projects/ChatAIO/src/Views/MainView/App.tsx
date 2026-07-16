/**
 * @description MainView 主组件
 * 渲染在 mainWindow HTML 中，承载 MenuBar 等全局组件。
 * 使用 -webkit-app-region 实现原生窗口拖拽。
 * 垂直几何见 shared/menubar-geometry.ts。
 */

export const App = reaxper( () => {
	const { store } = reaxel_MainView;
	const barHeight = getBarHeight();
	const itemMarginY = getMenuItemMarginY();
	const isDarwin = store.platform === 'darwin';

	return (
		<div
			className="main-view-root"
			data-theme={ store.theme }
			data-platform={ store.platform }
			style={ {
				height : `${ barHeight }px` ,
				'--menu-bar-height' : `${ barHeight }px` ,
				'--menu-item-height' : `${ MENU_ITEM_HEIGHT }px` ,
				'--menu-item-margin-y' : `${ itemMarginY }px` ,
				'--traffic-light-spacer-width' : `${ TRAFFIC_LIGHT_SPACER_WIDTH }px`,
			} as React.CSSProperties }
		>
			{ isDarwin && <div className="main-view-traffic-light-spacer" /> }
			<MenuBar />
			<MenuBarCenterCluster />
		</div>
	);
} );


import { MenuBar } from './components/MenuBar';
import { MenuBarCenterCluster } from './components/MenuBarCenterCluster';
import { getBarHeight , reaxel_MainView } from './reaxels/main-view';
import {
	getMenuItemMarginY ,
	MENU_ITEM_HEIGHT ,
	TRAFFIC_LIGHT_SPACER_WIDTH,
} from '#src/shared/menubar-geometry';
import { reaxper } from 'reaxes-react';
import './index.less';
