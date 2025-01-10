export const reaxel_ScreenAdapter = reaxel( () => {
	
	//app在4k分辨率下的基础宽高
	const baseAppBounds = {
		width : 1600 ,
		height : 1700 ,
	};
	const { store , setState } = orzMobx( {
		// screenWidth : width,
		// screenHeight : height,
		
	} );
	
	const calculateActualAppBounds = () => {
		const systemSize = screen.getPrimaryDisplay().size;
		const minAxis = Math.min( systemSize.width , systemSize.height );
		// const heightPercent = 1700/2160;
		const heightPercent = .85;
		console.log( systemSize );
		//宽屏模式
		const actualHeight = systemSize.height * heightPercent;
		const actualWidth = actualHeight / baseAppBounds.height * baseAppBounds.width;
		
		reaxel_MainProcessHub().mainWindow?.setBounds( {
			width : actualWidth ,
			height : actualHeight ,
			x : systemSize.width / 2 - actualWidth / 2 ,
			y : systemSize.height / 2 - actualHeight / 2 ,
			
		} , true );
	};
	
	obsReaction( () => {
		if( reaxel_MainProcessHub().mainWindow ) {
			calculateActualAppBounds();
		}
	} , () => [ reaxel_MainProcessHub().mainWindow ] );
	
	app.whenReady().then( () => {
		
		const electronScreen = screen;
		
		electronScreen.on( 'display-metrics-changed' , ( event , display , changedMetrics ) => {
			console.log('显示器分辨率发生变化:');
			console.log(`ID: ${ display.id }`);
			console.log(`分辨率: ${ display.size.width }x${ display.size.height }`);
			console.log(`缩放比例: ${ display.scaleFactor }`);
			console.log(`变化的属性: ${ changedMetrics }`);
			calculateActualAppBounds();
		} );
	} );
	
	let rets = {};
	return () => {
		
		return rets;
	};
} );

import { IPCLogger } from '#main/reaxels/devtools-logger';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { screen , app } from 'electron';
