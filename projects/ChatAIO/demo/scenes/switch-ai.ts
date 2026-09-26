/**
 * 切 AI：中区 badge 亮出六家、具名点 Gemini / Claude，再用 menubar Prev/Next。
 * 下拉点名禁止扫过列表。不要先滑到 badge 干等再点同一颗。连点 Next 时留在按钮上。
 * 设计：docs/features/playwright-demo-script.md
 */

export const runSwitchAiScene = async( ctx:DemoContext ) => {
	await waitForMainShell( ctx.electronApp );
	await presentDemoWindow( ctx.electronApp );
	const vendors = await readBundledVendors( bundledCatalogPath( ctx.chatAioRoot ) );
	const gemini = vendorByFamily( vendors , 'gemini' );
	const claude = vendorByFamily( vendors , 'claude' );
	const deepseek = vendorByFamily( vendors , 'deepseek' );
	const grok = vendorByFamily( vendors , 'grok' );
	await pickAiFromBadge( ctx , gemini.id , true );
	await pickAiFromBadge( ctx , claude.id , false );

	await demoClickMenubarNav( ctx , MENU_IDS.nextInstantiated );
	await waitForCurrentAi( ctx , deepseek.id );
	await demoClickMenubarNav( ctx , MENU_IDS.nextInstantiated );
	await waitForCurrentAi( ctx , grok.id );
	await demoClickMenubarNav( ctx , MENU_IDS.prevInstantiated );
	await waitForCurrentAi( ctx , deepseek.id );
};

const pickAiFromBadge = async( ctx:DemoContext , aiId:string , firstList:boolean ) => {
	const dropdown = await demoOpenCurrentAi( ctx );
	const item = dropdown.locator( `[data-item-payload="${ aiId }"]` );
	await item.waitFor( {
		state : 'visible' ,
		timeout : 15_000,
	} );
	await beat( firstList ? ctx.pace.listHoldMs : ctx.pace.listHoldRepeatMs );
	await demoClickDirect( item , ctx.pace );
	await waitForCurrentAi( ctx , aiId );
};

import { bundledCatalogPath } from '../support/profile';
import { readBundledVendors , vendorByFamily } from '../support/catalog';
import { demoClickDirect } from '../support/mouse';
import { beat } from '../support/pace';
import { presentDemoWindow } from '../support/launch';
import {
	demoClickMenubarNav ,
	demoOpenCurrentAi ,
	waitForCurrentAi ,
	waitForMainShell ,
	type DemoContext,
} from '../support/shell';
import { MENU_IDS } from '../../e2e/support/selectors';
