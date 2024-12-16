/**
 * 会将main的log发送至mainWindow的devtools异步打印
 */
export const IPCLogger = ( ...log: any ) => {
	mainWindowLoaded.then( win => {
		win.webContents.send( 'console' , log );
	} );
};

import { mainWindowLoaded } from '#project/src/Main/mainWindow-loaded-promise';
