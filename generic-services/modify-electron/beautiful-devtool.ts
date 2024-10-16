import { app , globalShortcut , BrowserWindow } from 'electron';
// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。


export const useBeautifulDevtool = ( window: BrowserWindow ) => {
	
	app.whenReady().then( () => {
		if(!window){
			return
		}
		globalShortcut.register( 'F12' , () => {
			window.webContents.toggleDevTools();
		} );
		
		window.webContents.on( 'devtools-opened' , () => {
			const css: string = `
        :root {
            --sys-color-base: var(--ref-palette-neutral100);
            --source-code-font-family: consolas;
            --source-code-font-size: 12px;
            --monospace-font-family: consolas;
            --monospace-font-size: 12px;
            --default-font-family: system-ui, sans-serif;
            --default-font-size: 12px;
        }
        .-theme-with-dark-background {
            --sys-color-base: var(--ref-palette-secondary25);
        }
        body {
            --default-font-family: system-ui,sans-serif;
        }`;
			window.webContents.devToolsWebContents.executeJavaScript( `
				const overriddenStyle = document.createElement('style');
				overriddenStyle.innerHTML = '${ css.replaceAll( '\n' , ' ' ) }';
				document.body.append(overriddenStyle);
				document.body.classList.remove('platform-windows');` 
			);
		} );
		
	} );
	
};
