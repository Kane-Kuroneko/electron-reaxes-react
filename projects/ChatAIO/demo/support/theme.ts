/**
 * 开录前把壳层打成浅色。向导默认 Follow System；Windows 上 getSystemTheme 读的是
 * 系统集成色，不受 nativeTheme.themeSource 影响，赶上深色就会先整页发黑。
 * 主进程在 CHATAIO_DEMO 下会把 Guiding defaults 钉成 light。默认 take 不进 Guiding，
 * 这里仍等 MainView 可见后再让 OBS 开录。
 * 设计：docs/features/playwright-demo-record.md
 */

export const primeDemoLightTheme = async( electronApp:ElectronApplication ) => {
	try {
		await electronApp.evaluate( ( { nativeTheme } ) => {
			nativeTheme.themeSource = 'light';
		} );
	} catch {
		/* 启动中 */
	}

	const started = Date.now();
	while( Date.now() - started < 60_000 ) {
		const guiding = findWindowByUrl( electronApp , 'GuidingView' );
		if( guiding ) {
			await guiding.getByTestId( TEST_IDS.guidingRoot ).waitFor( {
				state : 'visible' ,
				timeout : 45_000,
			} );
			await selectLightRadio( guiding );
			return;
		}
		const main = findWindowByUrl( electronApp , 'MainView' );
		if( main ) {
			await main.getByTestId( TEST_IDS.menubar ).waitFor( {
				state : 'visible' ,
				timeout : 45_000,
			} );
			return;
		}
		await sleep( 150 );
	}
	throw new Error( 'demo window missing while priming light theme' );
};

const selectLightRadio = async( page:Page ) => {
	const light = page.getByRole( 'radio' , {
		name : 'Light' ,
		exact : true,
	} );
	try {
		await light.waitFor( {
			state : 'visible' ,
			timeout : 20_000,
		} );
	} catch {
		/* 向导未停在外观页则交给 setup 场景再点 */
		return;
	}
	if( await light.isChecked() ) {
		return;
	}
	await light.click( {
		timeout : 10_000,
	} );
	const checkedAt = Date.now();
	while( Date.now() - checkedAt < 4_000 ) {
		if( await light.isChecked() ) {
			return;
		}
		await sleep( 80 );
	}
};

import { sleep } from './pace';
import { findWindowByUrl } from '../../e2e/support/app-probe';
import { TEST_IDS } from '../../e2e/support/selectors';
import type { ElectronApplication , Page } from '@playwright/test';
