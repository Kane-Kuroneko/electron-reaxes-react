/**
 * @description MainView 主组件
 * 渲染在 mainWindow HTML 中，承载 MenuBar 等全局组件。
 * 使用 -webkit-app-region 实现原生窗口拖拽。
 */

export const App = reaxper( () => {
	const { store } = reaxel_MainView;
	const barHeight = getBarHeight( store.platform );
	const isDarwin = store.platform === 'darwin';

	return (
		<div
			className="main-view-root"
			data-theme={ store.theme }
			style={ {
				height : `${ barHeight }px` ,
				'--menu-bar-height' : `${ barHeight }px`,
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
import { reaxper } from 'reaxes-react';
import './index.less';
