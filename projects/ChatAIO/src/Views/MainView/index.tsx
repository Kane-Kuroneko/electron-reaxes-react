installMenubarRendererErrorHandlers( 'main-view-renderer' );

// 在 React 挂载前同步注册 IPC 与键盘导航，避免 Strict Mode useEffect 清理与主进程 send 竞态
const mainViewApi = reaxel_MainView();
mainViewApi.bindKeyboardNav();
api.onMenuViewCommand( mainViewApi.handleCommand );
api.menuViewReady();

const root = createRoot( document.getElementById( 'react-app-root' ) );

root.render( <App /> );


import { App } from './App';
import { createRoot } from 'react-dom/client';
import { reaxel_MainView } from './reaxels/main-view';
import { installMenubarRendererErrorHandlers } from '#src/shared/utils/menubar-error-report.utility';
