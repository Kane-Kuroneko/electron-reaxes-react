mainWindowLoaded.promise.then( (mainWindow) => {
	console.log(11111111);
	
	mainWindow.on( 'ready-to-show' , () => {
		mainWindow.webContents.executeJavaScript( f12OpenDevtools ).then((value) => {
			console.log(`执行成功,回执是:`,value);
		}).catch(e => {
			console.error(`错误:`,e);
		});
	} );
} );




/*@ts-ignore*/
import f12OpenDevtools from './f12-open-devtools.raw';
import { app , BrowserWindow } from 'electron';
