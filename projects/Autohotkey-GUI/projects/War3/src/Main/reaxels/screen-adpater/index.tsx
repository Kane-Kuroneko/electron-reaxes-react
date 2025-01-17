/**
 * 影响窗口在屏幕上展示的因素
 * [屏幕物理尺寸]
 * [屏幕分辨率]
 * [屏幕dpr]
 * [宽屏?方屏?竖屏?]
 *
 */

/*app在4k分辨率下的基础宽高*/
const baseAppBounds = {
	width : 1600 ,
	height : 1700 ,
};
const screenTypes = {};

export const reaxel_ScreenAdapter = reaxel( () => {
	
	const { store , setState } = orzMobx( {
		// screenWidth : width,
		// screenHeight : height,
		
	} );
	const reax_MainProcessHub = reaxel_MainProcessHub();
	const calculateActualAppBounds = () => {
		const systemSize = screen.getPrimaryDisplay().size;
		const minAxis = Math.min( systemSize.width , systemSize.height );
		// const heightPercent = 1700/2160;
		const heightPercent = .85;
		console.log( systemSize );
		//宽屏模式
		const actualHeight = systemSize.height * heightPercent;
		const actualWidth = actualHeight / baseAppBounds.height * baseAppBounds.width;
		
		
	};
	
	const resetMainWindowBounds = () => {
		reax_MainProcessHub.mainWindow?.setBounds( {
			width : actualWidth ,
			height : actualHeight ,
			x : systemSize.width / 2 - actualWidth / 2 ,
			y : systemSize.height / 2 - actualHeight / 2 ,
			
		} , true );
	};
	
	obsReaction( () => {
		if( reax_MainProcessHub.mainWindow ) {
			calculateActualAppBounds();
		}
	} , () => [ reax_MainProcessHub.mainWindow ] );
	
	app.whenReady().then( () => {
		
		const electronScreen = screen;
		
		electronScreen.on( 'display-metrics-changed' , ( event , display , changedMetrics ) => {
			console.log( '显示器分辨率发生变化:' );
			console.log( `ID: ${ display.id }` );
			console.log( `分辨率: ${ display.size.width }x${ display.size.height }` );
			console.log( `缩放比例: ${ display.scaleFactor }` );
			console.log( `变化的属性: ${ changedMetrics }` );
			calculateActualAppBounds();
		} );
	} );
	
	let rets = {};
	return () => {
		
		return rets;
	};
} );
const display = screen.getPrimaryDisplay();


console.log( JSON.stringify( {
	'文本缩放比率' : windowsTextScale ,
	'系统缩放比率' : windowsDisplayScale ,
	
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

/*原样显示 1800*1800 */
const $32寸4k显示器 = new SceneType( {
	width_px : 3840 ,
	height_px : 2160 ,
	width_inch : 27.9,
	height_inch : 15.7,
	distance_cm : 50,
	dpr : 1
} );

/*
等价于24寸1080p当作显示器
按照4k等比缩小, 占1080p屏幕一半
900 * 900
 */
var 大屏幕1080P会议 = new SceneType( {
	width_px : 1920 ,
	height_px : 1080 ,
	width_inch : 47.94,
	height_inch : 26.96,
	distance_cm : 200,
	dpr : 1
} );

/*

 */
const 小屏幕4k显示器放大 = new SceneType( {
	width_px : 3840 ,
	height_px : 2160 ,
	width_inch : 12.2,
	height_inch : 6.85,
	distance_cm : 50,
	dpr : 2.5
} );

/*

 */
const 小屏幕1080p15_6寸 = new SceneType( {
	width_px : 1920 ,
	height_px : 1080 ,
	width_inch : 13.6,
	height_inch : 7.65,
	distance_cm : 35,
	dpr : 1.25
} );

import { windowsTextScale } from './getWindowsTextScale';
import { windowsDisplayScale } from './getWindowsDisplayScale';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { app , screen } from 'electron';
