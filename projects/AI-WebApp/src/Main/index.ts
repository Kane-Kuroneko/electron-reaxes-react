// Modules to control application life and create native browser window
import { install } from 'source-map-support';
install();
import { reaxel_Settings } from "#main/reaxels/Settings";

logger.initialize();
process.title = "AI Web App";

app.whenReady().then( async () => {
	
	const win = mainWindow;
	// mainWindow.contentView.setBounds( {
	// 	x : 0 ,
	// 	y : 0 ,
	// 	width : 800 ,
	// 	height : 600 ,
	// } );
	
	useBeautifulDevtool( win );
	const proxyRules = 'http=127.0.0.1:7897;https=127.0.0.1:7897';
	const ses = win.webContents.session;
	await ses.setProxy({ proxyRules });
	reaxel_Settings();
	reaxel_Menu();
	
	useDevSettingsView();
	
	return win;
} );


app.whenReady().then( () => {
	
	const primaryDisplay = screen.getPrimaryDisplay();
	
	const scaleFactor = primaryDisplay.scaleFactor;
	
} );

app.on( 'before-quit' , () => {
	BrowserWindow.getAllWindows()?.[0]?.destroy();
} );


function useDevSettingsView(){
	Reaxel_View.setState({settingsViewOpened : true});
	const settingsView = reaxel_SettingsView().initSettingsView();
	settingsView.setVisible(true);
	mainWindow.contentView.addChildView(settingsView);
	settingsView.webContents.openDevTools();
}

import { mainWindow } from './mainWindow';
import { reaxel_Menu } from './reaxels/Menu';
import logger from 'electron-log/main';
import {
	app ,
	BrowserWindow ,
	screen ,
} from 'electron';
import process from 'node:process';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import { Reaxel_View } from "#main/reaxels/Views";
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { dev } from "electron-is";
