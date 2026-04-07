
export const setAppProfilePath = () => {
	const isDev = !app.isPackaged;
	
	const basePath = app.getPath( 'appData' ); // 不要直接用 userData
	const appName = app.getName();
	
	const userDataPath = path.join(
		basePath ,
		isDev ? `${ appName }-dev` : appName,
	);
	app.setPath( 'userData' , userDataPath );
}

import { app } from 'electron';
import path from 'node:path';
import { dev } from 'electron-is';
