/**
 * @description macOS 菜单栏渲染路径
 * macOS 有原生系统菜单栏承载 Application/Edit/View/Window 等基础功能，
 * 主进程推给 MainView 的 structure 仅含 Switch AI + 可选 Prev/Next。
 * 结构：traffic-light spacer → App Icon（纯展示）→ MenuBar…
 * 平台差异见 docs/architecture/menubar-platform-paths.md。
 */
export const MacMenuBar = reaxper( () => {
	const { store } = reaxel_MainView;

	return (
		<div
			className="main-view-root mac-menu-bar"
			data-theme={ store.theme }
			style={ getMenuBarRootStyleVars() as React.CSSProperties }
		>
			<div className="main-view-traffic-light-spacer" />
			<div className="main-view-app-icon-slot">
				<AppIconButton />
			</div>
			<MenuBar />
			<MenuBarCenterCluster />
			<MenuBarRightItems />
		</div>
	);
} );


import { AppIconButton } from '#MainView/components/AppIconButton';
import { MenuBar } from '#MainView/components/MenuBar';
import { MenuBarCenterCluster } from '#MainView/components/MenuBarCenterCluster';
import { MenuBarRightItems } from '#MainView/components/MenuBarRightItems';
import { reaxel_MainView } from '#MainView/reaxels/main-view';
import { getMenuBarRootStyleVars } from '#shared/menubar-geometry';
import { reaxper } from 'reaxes-react';
