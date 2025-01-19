const textScale = await getWindowsTextScale();


/**
 * 计算受dpr影响过的屏幕宽高
 * *为什么不直接用display.size? --因为size会被textScale和displayScale同时影响,而这个函数计算的是只受displayScaleSize影响的分辨率,因为textScaleSize并不影响UI的大小
 * display.size.width === realWithPx * displayScale * textScale 
 */
export const calcDprEffectedRes = (display:Display) => {
	return {
		dprWidth : display.size.width / textScale,
		dprHeight : display.size.height / textScale,
	}
}

/**
 * 获取屏幕宽高中短的那一边
 */
export const getShortSide = (display : Display) => {
	const min = Math.min( display.size.width , display.size.height );
	return {
		shortSide : (min === display.size.width ? "width" : "height") as "width"|"height",
		value : min,
	}
}

/**
 * 获取屏幕的物理参数
 */
export const getPhysicalScreens = () => {
	const exePath = `${ reaxel_ElectronENV().absAppStaticsPath }/assets/py_screen_info/screen_info.exe`;
	const cp = spawn(exePath);
	const promise = orzPromise<PhysicalScreen[]>();
	cp.stdout.on( 'data' , ( data ) => {
		const physicalScreens = JSON.parse( data ) as PhysicalScreen[];
		promise.resolve( physicalScreens );
	} );
	return promise;
}

export const convertActualSizeToScaleSize = ({width,height}) => {
	const { scaleFactor } = screen.getPrimaryDisplay();
	return {
		width : width / scaleFactor,
		height : height / scaleFactor
	}
}

export type PhysicalScreen = {
	"x": number,
	"y": number,
	"width": number,
	"height": number,
	"width_mm": number,
	"height_mm": number,
	"name": string,
	"is_primary": boolean,
	"ppi": number
};
import { getWindowsTextScale } from './getWindowsTextScale';
import { screen } from 'electron';
import type { Display , Size } from 'electron';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { spawn } from 'child_process';
