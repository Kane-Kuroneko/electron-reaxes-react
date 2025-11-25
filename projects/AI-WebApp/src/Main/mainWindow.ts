const {absAppRunningPath} = reaxel_ElectronENV()

app.disableHardwareAcceleration();
await app.whenReady();
/**
 * 
 * @param display 哪个显示器,默认为主显示器
 * @param scaleFactorType 要排除的缩放因子类型 win系统上scaleFactor获取到的因子=textScale*displayScale,一个是无障碍中的文本缩放,一个是显示器缩放
 */
const eliminateScaleFactor = async (
	display:Display,
	{width,height}:Record<"width"|"height" , number>,
	scaleFactorType : 'mixed'|'textFactor'|'displayFactor' = 'mixed'
) => {
	if(['textFactor','displayFactor'].includes(scaleFactorType)){
		throw new Error('暂未实现');
	}
	
	return {
		width : width / display.scaleFactor ,
		height : height / display.scaleFactor ,
	};
}

const {width,height} = await eliminateScaleFactor(screen.getPrimaryDisplay(),{width:3200,height:1800});

const defaultOptions:BrowserWindowConstructorOptions = {
	width : dev() ? width :400 ,
	height : dev() ? height : 300 ,
	webPreferences : {
		nodeIntegration: false,
		contextIsolation: true,
		preload: path.join(absAppRunningPath, 'preload.js'),
	} ,
};

// Create the browser window.
export const mainWindow = new BrowserWindow( _.merge({},defaultOptions));
import {xPromise} from 'reaxes-utils'


import { dev } from 'electron-is';
import { reaxel_ElectronENV } from "#generic/reaxels/runtime-paths";
import {
	app ,
	BrowserWindow ,
	type Display,
	type BrowserWindowConstructorOptions,
	screen,
} from 'electron';
import _ from 'lodash';
import * as path from 'node:path';
