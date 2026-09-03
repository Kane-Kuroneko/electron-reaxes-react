/**
 * 本地观测 E2E 执行：放慢点击、高亮目标、关窗前停住。
 * Electron `_electron.launch` 在 Playwright 1.62 没有 slowMo；`--headed` 对本来就有窗的 unpackaged Electron 几乎无效果。
 * 对齐 Orca 的 ORCA_E2E_SLOWMO_MS、官方 Inspector / locator.highlight / page.screencast.showActions。
 * 默认关闭，不影响 CI。设计：docs/features/e2e-playwright.md 「观测 Settings 执行」
 */

export const isE2EWatch = () => {
	return process.env.CHATAIO_E2E_WATCH === '1';
};

export const e2eSlowMoMs = () => {
	return readMsEnv( 'CHATAIO_E2E_SLOWMO_MS' , isE2EWatch() ? 600 : 0 );
};

export const e2eHoldMs = () => {
	return readMsEnv( 'CHATAIO_E2E_HOLD_MS' , isE2EWatch() ? 2000 : 0 );
};

export const observePause = async( extraMs = 0 ) => {
	const ms = e2eSlowMoMs() + extraMs;
	if( ms <= 0 ) {
		return;
	}
	await sleep( ms );
};

export const observeHighlight = async( locator:Locator ) => {
	if( isE2EWatch() === false && e2eSlowMoMs() <= 0 ) {
		return;
	}
	try {
		await locator.highlight();
	} catch {
		/* 节点已卸或 WCV 不支持 highlight */
	}
	await observePause();
};

export const watchClick = async( locator:Locator ) => {
	await observeHighlight( locator );
	await locator.click();
	await observePause();
};

export const enableActionOverlays = async( page:Page ) => {
	if( isE2EWatch() === false ) {
		return;
	}
	try {
		await page.screencast.showActions( {
			cursor : 'pointer' ,
			duration : Math.max( e2eSlowMoMs() , 500 ) ,
			position : 'top-right',
		} );
	} catch {
		/* 叠加层主要服务录屏；现场仍靠 highlight + pause */
	}
};

/* Settings 是主窗里的 WCV，fromWebContents 为 null；观测时把宿主主窗提到前台即可。 */
export const focusHostWindowForObserve = async( electronApp:ElectronApplication ) => {
	if( isE2EWatch() === false ) {
		return;
	}
	try {
		await electronApp.evaluate( ( { BrowserWindow } ) => {
			const win = BrowserWindow.getAllWindows().find( ( candidate ) => {
				return candidate.isDestroyed() === false;
			} );
			if( !win ) {
				return;
			}
			win.show();
			win.focus();
		} );
	} catch {
		/* 关窗过程中忽略 */
	}
};

const readMsEnv = ( name:string , fallback:number ) => {
	const raw = process.env[name];
	if( raw === undefined || raw === '' ) {
		return fallback;
	}
	const parsed = Number( raw );
	if( Number.isFinite( parsed ) === false ) {
		console.warn( `[chataio-e2e] ${ name }="${ raw }" is not a number; using ${ fallback }` );
		return fallback;
	}
	return Math.max( 0 , parsed );
};

const sleep = ( ms:number ) => {
	return new Promise<void>( ( resolve ) => {
		setTimeout( resolve , ms );
	} );
};

import type { ElectronApplication , Locator , Page } from '@playwright/test';
