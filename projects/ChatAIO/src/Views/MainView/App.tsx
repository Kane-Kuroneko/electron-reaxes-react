/**
 * @description MainView 根组件
 * 渲染在 mainWindow HTML 中，承载 MenuBar 等全局组件。
 * 在根部按 store.platform 分叉为 macOS / Windows 两套渲染路径，
 * 不再做 OS 条件渲染或 [data-platform] 条件 CSS。
 * 两平台的内容/视图差异见 docs/architecture/menubar-platform-paths.md。
 * 垂直几何见 shared/menubar-geometry.ts。
 */

export const App = reaxper( () => {
	const { store } = reaxel_MainView;
	
	return {
		'darwin' : <MacMenuBar /> ,
		'win32' : <WindowsMenuBar /> ,
	}[store.platform];
} );


import { MacMenuBar } from './components/MacMenuBar';
import { WindowsMenuBar } from './components/WindowsMenuBar';
import { reaxel_MainView } from './reaxels/main-view';
import { reaxper } from 'reaxes-react';
import './index.less';
