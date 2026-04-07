import { app } from 'electron';
import { whenReadyInitTray, whenReadyInitMainWindow } from './when-ready-init';

app.whenReady().then(() => {
	whenReadyInitTray();
	whenReadyInitMainWindow();
}).catch(e => {
	// 可以在这里添加错误处理逻辑
});
