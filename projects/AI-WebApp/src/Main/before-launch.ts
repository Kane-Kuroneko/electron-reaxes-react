






import './electron.conf';
import { install } from 'source-map-support';
import { reaxel_Settings } from "#main/reaxels/Settings";
import { mainWindow } from './mainWindow';
import { reaxel_Menu } from './reaxels/Menu';
import logger from 'electron-log/main';
import {
	app ,
	BrowserWindow ,
	screen ,
} from 'electron';
import process from 'node:process';
import { useBeautifulDevtool } from '#generics/modify-electron/beautiful-devtool';
import { Reaxel_View } from "#main/reaxels/Views";
import { reaxel_SettingsView } from "#main/reaxels/Views/Settings-View";
import { dev } from "electron-is";
