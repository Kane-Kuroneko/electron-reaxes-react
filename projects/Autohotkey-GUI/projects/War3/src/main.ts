// Modules to control application life and create native browser window
import { app , BrowserWindow , globalShortcut , ipcMain , ipcRenderer , screen } from 'electron';
import path from 'path';
import Config from '../config';
import purdy from 'purdy';
import process,{ execSync } from 'child_process';

console.log(__NODE_ENV__);

const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow( {
		width : 2400 ,
		height : 1080 ,
		webPreferences : {
			devTools : true ,
			contextIsolation : true ,
			preload : path.resolve( 'preload.js' ) ,
			experimentalFeatures : false ,
		} ,
	} );
	
	// 加载 index.html
	if( __NODE_ENV__ === 'development' ) {
		mainWindow.loadURL( `https://127.0.0.1:${ __DEV_PORT__ }` );
	} else {
		mainWindow.loadFile( "renderer/index.html" );
	}
	
	// mainWindow.removeMenu();
	
	
	// 打开开发工具
	mainWindow.webContents.openDevTools();
	return mainWindow;
};

// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then( () => {
	const mainWindow = createWindow();
	globalShortcut.register( 'F12' , () => {
		if( mainWindow ) {
			mainWindow.webContents.toggleDevTools();
		}
	} );
	
	mainWindow.webContents.on( 'devtools-opened' , () => {
		const css = `
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
		mainWindow.webContents.devToolsWebContents.executeJavaScript( `
        const overriddenStyle = document.createElement('style');
        overriddenStyle.innerHTML = '${ css.replaceAll( '\n' , ' ' ) }';
        document.body.append(overriddenStyle);
        document.body.classList.remove('platform-windows');` );
	} );
	
	app.on( 'activate' , () => {
		// 在 macOS 系统内, 如果没有已开启的应用窗口
		// 点击托盘图标时通常会重新创建一个新窗口
		if( BrowserWindow.getAllWindows().length === 0 ) createWindow();
	} );
} );

ipcMain.on( 'test' , ( event , data ) => {
	// purdy(data);
} );

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态, 
// 直到用户使用 Cmd + Q 明确退出
app.on( 'window-all-closed' , () => {
	if( process.platform !== 'darwin' ) app.quit();
} );


app.whenReady().then( () => {
	process.exec('chcp 65001', (error, stdout, stderr) => {
		if (error) {
			console.error(`Error setting console encoding: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`stderr: ${stderr}`);
			return;
		}
		console.log(`stdout: ${stdout}`);
		console.log('控制台中文测试: 确认是否有效');
	});
	const primaryDisplay = screen.getPrimaryDisplay();
	
	const scaleFactor = primaryDisplay.scaleFactor;
	
	console.log( `少しずつ少しずつ少しずつ: ${ scaleFactor }` );
	
	console.log('阿斯达大师大师大大');
	// console.log( 'HDR support:' , hdrSupported );
} );

// 在当前文件中你可以引入所有的主进程代码
// 也可以拆分成几个文件，然后用 require 导入。
