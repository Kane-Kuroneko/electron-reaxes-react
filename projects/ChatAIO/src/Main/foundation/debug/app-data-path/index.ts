
export const setAppProfilePath = () => {
	/* E2E：隔离临时 userData，禁止污染本机 ChatAIO-dev 配置。docs/features/e2e-playwright.md */
	const e2eUserDataDir = process.env.CHATAIO_E2E_USER_DATA_DIR;
	if( isChatAioE2E() && e2eUserDataDir ) {
		app.setPath( 'userData' , e2eUserDataDir );
		return;
	}

	const isDev = !app.isPackaged;
	
	const basePath = app.getPath( 'appData' ); // 不要直接用 userData
	const appName = app.getName();
	
	const userDataPath = path.join(
		basePath ,
		isDev ? `${ appName }-dev` : appName,
	);
	app.setPath( 'userData' , userDataPath );
}

import { isChatAioE2E } from '#main/foundation/e2e-mode';
import { app } from 'electron';
import path from 'node:path';
