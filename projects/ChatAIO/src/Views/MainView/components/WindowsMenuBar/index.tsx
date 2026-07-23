/**
 * @description Windows 菜单栏渲染路径
 * Windows 无原生菜单栏（主进程 setMenu(null)），MainView 完整取代之：
 * 主进程推给 MainView 的 structure 含 Application/View + Switch AI + 可选 Prev/Next。
 * 无 traffic-light spacer；Prev/Next 为凸起样式。
 * 平台差异见 docs/architecture/menubar-platform-paths.md。
 */
export const WindowsMenuBar = reaxper( () => {
	const { store } = reaxel_MainView;

	return (
		<div
			className="main-view-root win-menu-bar"
			data-theme={ store.theme }
			style={ getMenuBarRootStyleVars() as React.CSSProperties }
		>
			<MenuBar />
			<MenuBarCenterCluster />
			<MenuBarRightItems />
		</div>
	);
} );


import { MenuBar } from '#MainView/components/MenuBar';
import { MenuBarCenterCluster } from '#MainView/components/MenuBarCenterCluster';
import { MenuBarRightItems } from '#MainView/components/MenuBarRightItems';
import { reaxel_MainView } from '#MainView/reaxels/main-view';
import { getMenuBarRootStyleVars } from '#src/shared/menubar-geometry';
import { reaxper } from 'reaxes-react';
