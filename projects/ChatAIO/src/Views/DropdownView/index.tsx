installMenubarRendererErrorHandlers( 'dropdown-view-renderer' );

const root = createRoot( document.getElementById( 'react-app-root' ) );

root.render( <App /> );


import './dropdown-view-debug.less';
import { App } from './App';
import { createRoot } from 'react-dom/client';
import { installMenubarRendererErrorHandlers } from '#shared/utils/menubar-error-report.utility';
