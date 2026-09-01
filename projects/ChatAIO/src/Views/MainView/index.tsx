installMenubarRendererErrorHandlers( 'main-view-renderer' );
/* 必须在 menu-view:ready 之前启动：layout 探针要量到 ready 与首绘的缺口。
 * visual-ready 是 Phase 5 门闩；boot-probe 只观测。
 * 设计：docs/features/menubar-cold-start-monitor.md */
startMenubarColdStartRendererProbe();

// 在 React 挂载前同步注册 IPC 与键盘导航，避免 Strict Mode useEffect 清理与主进程 send 竞态
const mainViewApi = reaxel_MainView();
mainViewApi.bindKeyboardNav();
api.onMenuViewCommand( mainViewApi.handleCommand );
api.onUpdateStateChanged( mainViewApi.applyUpdateState );
/* 此信号只表示 IPC 已绑，不等于 menubar 已绘。Phase 5 若等它就会放行当前 WCV。 */
noteMenubarBootMilestone( 'renderer-ready-sent' );
api.menuViewReady();
void api.getUpdateState().then( mainViewApi.applyUpdateState ).catch( () => {} );

const root = createRoot( document.getElementById( 'react-app-root' ) );
noteMenubarBootMilestone( 'renderer-create-root' );

root.render( <App /> );


import { App } from './App';
import {
	noteMenubarBootMilestone ,
	startMenubarColdStartRendererProbe,
} from './utils/menubar-cold-start-probe.utility';
import { reaxel_MainView } from '#MainView/reaxels/main-view';
import { installMenubarRendererErrorHandlers } from '#shared/utils/menubar-error-report.utility';
import { createRoot } from 'react-dom/client';
