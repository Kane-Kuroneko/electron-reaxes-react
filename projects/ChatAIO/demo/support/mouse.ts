/**
 * 出镜点击：屏幕指针先滑到目标再 CDP 按下。
 * 真正按下必须走 CDP mouse.down/up（isTrusted）。
 * 指针画在独立透明层上，按屏幕坐标滑，轨迹不断；CDP 只在终点落到目标页
 * （列表点名不会沿途 hover 每一行）。
 * 设计：docs/features/playwright-demo-record.md 、docs/features/playwright-demo-script.md
 */

const NEAR_PX = 12;

export type DemoClickOpts = {
	afterMs? : number;
	settleMs? : number;
};

export const demoClick = async( locator:Locator , pace:DemoPace , opts?:DemoClickOpts ) => {
	await clickAtLocator( locator , pace , 'sweep' , opts );
};

/**
 * 下拉 / 选择列表：指针从当前位置滑到目标行再点，禁止沿列表逐项扫过 hover。
 * 点击仍走 CDP down/up。光点由 pulse() 在按下前打出。
 */
export const demoClickDirect = async( locator:Locator , pace:DemoPace , opts?:DemoClickOpts ) => {
	await clickAtLocator( locator , pace , 'direct' , opts );
};

export const demoMoveTo = async( locator:Locator , pace:DemoPace ) => {
	const page = locator.page();
	await locator.scrollIntoViewIfNeeded();
	const point = await centerOf( locator );
	await glideToPagePoint( page , point.x , point.y , pace );
	await beat( pace.hoverMs );
};

/** 不点，只把屏幕指针亮到目标上（preroll / 收尾）。 */
export const showDemoCursorAt = async( locator:Locator ) => {
	const page = locator.page();
	await locator.scrollIntoViewIfNeeded();
	const point = await centerOf( locator );
	await jumpPageMouse( page , point.x , point.y );
};

export const demoClickAt = async( page:Page , x:number , y:number , pace:DemoPace , opts?:DemoClickOpts ) => {
	await glideToPagePoint( page , x , y , pace );
	await pressAtPage( page , pace , opts?.settleMs ?? pace.hoverMs );
	if( isTransientDemoPage( page ) || page.isClosed() ) {
		await parkDemoCursorOnStableShell();
	}
	await beat( opts?.afterMs ?? pace.afterClickMs );
};

const clickAtLocator = async(
	locator:Locator ,
	pace:DemoPace ,
	travel:'sweep' | 'direct',
	opts?:DemoClickOpts,
) => {
	const page = locator.page();
	await locator.scrollIntoViewIfNeeded();
	const point = await centerOf( locator );
	await glideToPagePoint( page , point.x , point.y , pace );
	const settle = opts?.settleMs
		?? ( travel === 'direct' ? pace.directSettleMs : pace.hoverMs );
	await pressAtPage( page , pace , settle );
	if( isTransientDemoPage( page ) || page.isClosed() ) {
		await parkDemoCursorOnStableShell();
	}
	await beat( opts?.afterMs ?? pace.afterClickMs );
};

const pressAtPage = async( page:Page , pace:DemoPace , settleMs:number ) => {
	await beat( settleMs );
	await pulseDemoCursor( page );
	await beat( pace.clickFlashMs );
	try {
		await page.mouse.down();
		await page.mouse.up();
	} catch {
		/* 点菜单项会 hide DropdownView；Guiding 长按完成会拆页 */
	}
};

export const demoLongPress = async( locator:Locator , pace:DemoPace ) => {
	const page = locator.page();
	await locator.scrollIntoViewIfNeeded();
	const point = await centerOf( locator );
	await glideToPagePoint( page , point.x , point.y , pace );
	await beat( pace.hoverMs );
	await pulseDemoCursor( page );
	await beat( pace.clickFlashMs );
	try {
		await page.mouse.down();
		await beat( pace.longPressMs );
		await page.mouse.up();
	} catch {
		/* Guiding「Hold to finish」会拆掉本页 */
	}
	await parkDemoCursorOnStableShell();
	await beat( pace.afterPageMs );
};

export const demoFillSlow = async( locator:Locator , text:string , pace:DemoPace ) => {
	await demoClick( locator , pace );
	try {
		await locator.focus();
	} catch {
		/* 已聚焦或节点卸了 */
	}
	const page = locator.page();
	try {
		await page.keyboard.press( demoModifierChord( 'A' ) );
	} catch {
		/* 选不中也继续打 */
	}
	await typeHuman( page , text , pace );
};

const typeHuman = async( page:Page , text:string , pace:DemoPace ) => {
	const parts = text.split( /(\s+)/ );
	for( const part of parts ) {
		if( part.length === 0 ) {
			continue;
		}
		await page.keyboard.type( part , {
			delay : pace.typeDelayMs,
		} );
		if( /^\s+$/.test( part ) ) {
			await beat( pace.typePauseMs );
		}
	}
};

export const demoPaste = async( page:Page , pace:DemoPace ) => {
	await page.keyboard.press( demoModifierChord( 'V' ) );
	await beat( pace.pasteHoldMs );
};

export const demoModifierChord = ( key:string ) => {
	return process.platform === 'darwin' ? `Meta+${ key }` : `Control+${ key }`;
};

const centerOf = async( locator:Locator ) => {
	const box = await locator.boundingBox();
	if( !box ) {
		throw new Error( 'demo click target has no bounding box' );
	}
	return {
		x : box.x + box.width / 2 ,
		y : box.y + box.height / 2,
	};
};

const clamp = ( value:number , min:number , max:number ) => {
	if( max < min ) {
		return min;
	}
	return Math.min( max , Math.max( min , value ) );
};

const glideToPagePoint = async( page:Page , x:number , y:number , pace:DemoPace ) => {
	const origin = await getDemoPageOrigin( page ) || await getRendererScreenFallback( page );
	const toScreen = origin
		? {
			x : origin.x + x ,
			y : origin.y + y,
		}
		: {
			x ,
			y,
		};
	await glideDemoCursorScreen( toScreen , pace );
	try {
		await page.mouse.move( x , y , {
			steps : 1,
		} );
	} catch {
		/* 页正在卸 */
	}
};

const glideDemoCursorScreen = async(
	to:{ x:number; y:number } ,
	pace:DemoPace,
) => {
	const from = getDemoCursorScreen() || {
		x : to.x - 28 ,
		y : to.y - 6,
	};
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const distance = Math.hypot( dx , dy );
	if( distance < NEAR_PX ) {
		await moveDemoCursorScreen( to.x , to.y );
		return;
	}
	const duration = clamp(
		Math.round( pace.moveMinMs + distance * pace.movePxMs ) ,
		pace.moveMinMs ,
		pace.moveMs,
	);
	const steps = clamp( Math.round( distance / 9 ) , 5 , 26 );
	const arc = distance > 96
		? distance * 0.08 * ( ( Math.round( from.x + to.y ) % 2 ) * 2 - 1 )
		: 0;
	const len = distance || 1;
	const ctrl = {
		x : ( from.x + to.x ) / 2 - ( dy / len ) * arc ,
		y : ( from.y + to.y ) / 2 + ( dx / len ) * arc,
	};
	await animateDemoCursorAlong( {
		from ,
		to ,
		ctrl ,
		duration ,
		steps,
	} );
};

const jumpPageMouse = async( page:Page , x:number , y:number ) => {
	const origin = await getDemoPageOrigin( page ) || await getRendererScreenFallback( page );
	if( origin ) {
		await moveDemoCursorScreen( origin.x + x , origin.y + y );
	}
	try {
		await page.mouse.move( x , y , {
			steps : 1,
		} );
	} catch {
		/* 主壳尚未可点 */
	}
};

const getRendererScreenFallback = async( page:Page ) => {
	try {
		return await page.evaluate( () => {
			const chrome = Math.max( 0 , window.outerHeight - window.innerHeight );
			return {
				x : window.screenX ,
				y : window.screenY + chrome ,
				width : Math.max( 1 , window.innerWidth ) ,
				height : Math.max( 1 , window.innerHeight ),
			};
		} );
	} catch {
		return null;
	}
};

const parkDemoCursorOnStableShell = async() => {
	const shell = findStableDemoShellPage();
	const screen = getDemoCursorScreen();
	await raiseDemoCursorLayer();
	if( !shell || !screen ) {
		return;
	}
	const origin = await getDemoPageOrigin( shell ) || await getRendererScreenFallback( shell );
	if( !origin ) {
		return;
	}
	const localX = clamp( screen.x - origin.x , 0 , origin.width - 1 );
	const localY = clamp( screen.y - origin.y , 0 , origin.height - 1 );
	try {
		await shell.mouse.move( localX , localY , {
			steps : 1,
		} );
	} catch {
		/* 主壳尚未可点 */
	}
};

import type { Locator , Page } from '@playwright/test';
import {
	animateDemoCursorAlong ,
	findStableDemoShellPage ,
	getDemoCursorScreen ,
	getDemoPageOrigin ,
	isTransientDemoPage ,
	moveDemoCursorScreen ,
	pulseDemoCursor ,
	raiseDemoCursorLayer,
} from './cursor';
import { beat , type DemoPace } from './pace';
