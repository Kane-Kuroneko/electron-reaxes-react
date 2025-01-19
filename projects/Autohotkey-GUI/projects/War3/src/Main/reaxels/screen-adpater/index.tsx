/**
 * 适配方案演示https://www.figma.com/design/5ttni1km306mFuZPRpGaVJ/Untitled?node-id=0-1&m=dev&t=1255ePvWcFfSgafX-1
 * 影响窗口在屏幕上展示的因素
 * [屏幕物理尺寸]
 * [屏幕分辨率]
 * [屏幕dpr]
 * [宽屏?方屏?竖屏?]
 ***************************
 * - screen.width = 逻辑像素数 = 物理像素数/
 * - dpr决定了用户观看距离
 * - 16/9的ar为1.7777*
 */

/*app在4k分辨率下的基础宽高*/
const baseAppBounds = {
	width : 1600 ,
	height : 1700 ,
};
const windowsTextScale = await getWindowsTextScale();
const screenTypes = {};
/*app的最佳观看视距大小为690mm/米 */
const appHeightRatio = 690;
export const reaxel_ScreenAdapter = reaxel( () => {
	
	const { store , setState } = orzMobx( {
		// screenWidth : width,
		// screenHeight : height,
		
	} );
	
	const calcActualAppSize = async (display:Display = screen.getPrimaryDisplay()) => {
		try {
			const currentPhysicalScreen = (await getPhysicalScreens()).find((itm,index,arr) => {
				if(arr.length === 1) return true;
				else {
					/*需要完善显示器匹配逻辑*/
					debugger;
				}
			});
			const { shortSide , value } = getShortSide( display );
			let percent = .9;
			
			//近距离使用大屏幕无缩放的场景
			if(
				getWindowsDisplayScale(display) < 1.2
				&&
				currentPhysicalScreen.ppi < 103 
				&&
				currentPhysicalScreen.width * currentPhysicalScreen.height >= 3840*2160
				&&
				(currentPhysicalScreen.width_mm > 950 || currentPhysicalScreen.height_mm > 534)
			){
				percent = .6;
			}
			if(shortSide === 'height'){
				const appActualHeight = currentPhysicalScreen.height * percent;
				const appActualWidth = appActualHeight;
				return convertActualSizeToScaleSize({
					width : appActualWidth,
					height : appActualHeight,
				})
			}else {
				const appActualWidth = currentPhysicalScreen.width * percent;
				const appActualHeight = appActualWidth;
				return convertActualSizeToScaleSize({
					width : appActualWidth,
					height : appActualHeight,
				})
			} 
		}catch ( e ) {
			console.error( e );
		}
	};
	
	const resetMainWindowBounds = async (display = screen.getPrimaryDisplay()) => {
		const {height,width} = await calcActualAppSize();
		const {width:originalWidth,height:originalHeight} = await getCurrentPhysicalScreen(display);
		reaxel_MainProcessHub().mainWindow?.setBounds( {
			width ,
			height ,
			x : originalWidth / 2 - width / 2 ,
			y : originalHeight / 2 - height / 2 ,
			
		} , true );
	};
	
	const getCurrentPhysicalScreen = async (display:Display) => {
		return (await getPhysicalScreens()).find(s => s.name === display.label);
	}
	
	// obsReaction( () => {
	// 	if( reaxel_MainProcessHub().mainWindow ) {
	// 		resetMainWindowBounds();
	// 	}
	// } , () => [ reaxel_MainProcessHub().mainWindow ] );
	
	app.whenReady().then( () => {
		
		const electronScreen = screen;
		
		electronScreen.on( 'display-metrics-changed' , ( event , display , changedMetrics ) => {
			console.log( '显示器分辨率发生变化:' );
			console.log( `ID: ${ display.id }` );
			console.log( `分辨率: ${ display.size.width }x${ display.size.height }` );
			console.log( `缩放比例: ${ display.scaleFactor }` );
			console.log( `变化的属性: ${ changedMetrics }` );
			resetMainWindowBounds();
		} );
	} );
	
	let rets = {
		calcActualAppSize,
	};
	return () => {
		
		return rets;
	};
} );


console.log( JSON.stringify( {
	'文本缩放比率' : windowsTextScale ,
	'系统缩放比率' : await getWindowsDisplayScale(),
	
} , null , 3 ) );

/**
 * 定义用户使用的设备及场景
 */
abstract class ScreenType {
	width_px: number;
	height_px: number;
	width_inch: number;
	height_inch: number;
}

class SceneType extends ScreenType {
	distance_cm: number;
	dpr: number;
	/*aspectRatio*/
	ar: number;
	
	constructor( opts: {
		distance_cm: number,
		dpr: number,
		width_px: number,
		height_px: number,
		width_inch: number,
		height_inch: number,
	} ) {
		super();
		Object.assign( this , {
			...opts,
			ar : opts.width_px / opts.height_px ,
		} );
	}
}

import { getWindowsTextScale } from './getWindowsTextScale';
import { calcDprEffectedRes , getShortSide , getPhysicalScreens , PhysicalScreen , convertActualSizeToScaleSize } from './utils';

import { getWindowsDisplayScale } from './getWindowsDisplayScale';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { app , screen } from 'electron';
import type {Display} from 'electron';
