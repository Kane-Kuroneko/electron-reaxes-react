/**
 * 出镜点击：先把光标移过去再点，不要 locator.click 瞬移。
 * 真正按下必须走 CDP mouse.down/up（isTrusted）。
 * 移动按时长∝距离（Screen Studio Rapid：慢滑会看起来「点比光标先到」）。
 * 已经在目标上就别再滑一遍；列表点名用 demoClickDirect。
 * 点击光点是 pulse()，按下前只留一帧，和 down 叠在一起。
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
 * 下拉 / 选择列表：光标出现在目标行上直接点，禁止从上滑过中间项。
 * 点击仍走 CDP down/up。光点由 pulse() 在按下前打出。
 */
export const demoClickDirect = async( locator:Locator , pace:DemoPace , opts?:DemoClickOpts ) => {
	await clickAtLocator( locator , pace , 'direct' , opts );
};

export const demoMoveTo = async( locator:Locator , pace:DemoPace ) => {
	const page = locator.page();
	await locator.scrollIntoViewIfNeeded();
	const point = await centerOf( locator );
	await movePageMouse( page , point.x , point.y , pace );
	await beat( pace.hoverMs );
};

/** 不点，只把唯一那颗光标亮到目标上（preroll / 收尾）。 */
export const showDemoCursorAt = async( locator:Locator ) => {
	const page = locator.page();
	await locator.scrollIntoViewIfNeeded();
	const point = await centerOf( locator );
	await jumpPageMouse( page , point.x , point.y );
};

export const demoClickAt = async( page:Page , x:number , y:number , pace:DemoPace , opts?:DemoClickOpts ) => {
	await movePageMouse( page , x , y , pace );
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
	if( travel === 'direct' ) {
		await jumpPageMouse( page , point.x , point.y );
	} else {
		await movePageMouse( page , point.x , point.y , pace );
	}
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
	await movePageMouse( page , point.x , point.y , pace );
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

const movePageMouse = async( page:Page , x:number , y:number , pace:DemoPace ) => {
	await installDemoCursor( page );
	const origin = await getDemoPageOrigin( page ) || await getRendererScreenFallback( page );
	const viewport = await readPageViewport( page );
	const to = {
		x ,
		y,
	};
	let from : { x:number; y:number };
	const lastScreen = getDemoCursorScreen();
	if( lastScreen && origin ) {
		from = {
			x : clamp( lastScreen.x - origin.x , 0 , viewport.width - 1 ) ,
			y : clamp( lastScreen.y - origin.y , 0 , viewport.height - 1 ),
		};
	} else {
		// 第一次出场从目标旁边滑入，不要从客户区左上角飞过来
		from = {
			x : clamp( to.x - 28 , 0 , viewport.width - 1 ) ,
			y : clamp( to.y - 6 , 0 , viewport.height - 1 ),
		};
	}
	await page.mouse.move( from.x , from.y , {
		steps : 1,
	} );
	await setActiveDemoCursor( page , from.x , from.y );

	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const distance = Math.hypot( dx , dy );
	if( distance < NEAR_PX ) {
		await page.mouse.move( to.x , to.y , {
			steps : 1,
		} );
		await setActiveDemoCursor( page , to.x , to.y );
		rememberScreenPoint( origin , to.x , to.y );
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

	const started = Date.now();
	for( let i = 1; i <= steps; i++ ) {
		const t = i / steps;
		const eased = t * t * ( 3 - 2 * t );
		const rest = 1 - eased;
		const nx = rest * rest * from.x + 2 * rest * eased * ctrl.x + eased * eased * to.x;
		const ny = rest * rest * from.y + 2 * rest * eased * ctrl.y + eased * eased * to.y;
		await page.mouse.move( nx , ny , {
			steps : 1,
		} );
		await setActiveDemoCursor( page , nx , ny );
		const expected = Math.round( duration * t );
		const elapsed = Date.now() - started;
		if( expected > elapsed ) {
			await beat( expected - elapsed );
		}
	}
	await setActiveDemoCursor( page , to.x , to.y );
	rememberScreenPoint( origin , to.x , to.y );
};

const jumpPageMouse = async( page:Page , x:number , y:number ) => {
	await installDemoCursor( page );
	const origin = await getDemoPageOrigin( page ) || await getRendererScreenFallback( page );
	await page.mouse.move( x , y , {
		steps : 1,
	} );
	await setActiveDemoCursor( page , x , y );
	rememberScreenPoint( origin , x , y );
};

const rememberScreenPoint = (
	origin:{ x:number; y:number } | null ,
	x:number ,
	y:number,
) => {
	rememberDemoCursorScreen( origin , x , y );
};

const readPageViewport = async( page:Page ) => {
	try {
		return await page.evaluate( () => {
			return {
				width : Math.max( 1 , window.innerWidth ) ,
				height : Math.max( 1 , window.innerHeight ),
			};
		} );
	} catch {
		return {
			width : 2400 ,
			height : 1400,
		};
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
	const lastScreen = getDemoCursorScreen();
	if( !shell || !lastScreen ) {
		return;
	}
	await installDemoCursor( shell );
	const origin = await getDemoPageOrigin( shell ) || await getRendererScreenFallback( shell );
	if( !origin ) {
		return;
	}
	const localX = clamp( lastScreen.x - origin.x , 0 , origin.width - 1 );
	const localY = clamp( lastScreen.y - origin.y , 0 , origin.height - 1 );
	try {
		await shell.mouse.move( localX , localY , {
			steps : 1,
		} );
	} catch {
		/* 主壳尚未可点 */
	}
	await setActiveDemoCursor( shell , localX , localY );
};

import type { Locator , Page } from '@playwright/test';
import {
	findStableDemoShellPage ,
	getDemoCursorScreen ,
	getDemoPageOrigin ,
	installDemoCursor ,
	isTransientDemoPage ,
	pulseDemoCursor ,
	rememberDemoCursorScreen ,
	setActiveDemoCursor,
} from './cursor';
import { beat , type DemoPace } from './pace';
