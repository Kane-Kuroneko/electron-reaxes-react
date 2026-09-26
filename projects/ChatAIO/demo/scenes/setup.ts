/**
 * GuidingView 首启备带：浅色、直连、留下出镜六家。默认 playlist 不跑本场景。
 * 设计：docs/features/playwright-demo-script.md
 */

export const runSetupScene = async( ctx:DemoContext ) => {
	const guiding = await waitForGuiding( ctx.electronApp );
	await presentDemoWindow( ctx.electronApp );
	await installDemoCursor( guiding );
	await showDemoCursorAt( guiding.getByRole( 'radio' , { name : 'Light' , exact : true } ) );

	await demoClick( guiding.getByRole( 'radio' , { name : 'Light' , exact : true } ) , ctx.pace , {
		afterMs : ctx.pace.afterPageMs,
	} );
	await demoClick( guiding.getByRole( 'button' , { name : 'Next' } ) , ctx.pace );

	await demoClick(
		guiding.getByRole( 'radio' , { name : /I can connect directly/i } ) ,
		ctx.pace ,
		{
			afterMs : ctx.pace.afterPageMs,
		},
	);
	await demoClick( guiding.getByRole( 'button' , { name : 'Next' } ) , ctx.pace );

	const vendors = await readBundledVendors( bundledCatalogPath( ctx.chatAioRoot ) );
	for( const vendor of vendors ) {
		if( isShowcaseFamily( vendor.family ) ) {
			continue;
		}
		const option = guiding.locator( '.ai-option' ).filter( { hasText : vendor.label } );
		if( await option.count() === 0 ) {
			continue;
		}
		const box = option.locator( 'input[type="checkbox"]' );
		if( await box.isChecked() ) {
			await demoClick( option , ctx.pace );
		}
	}
	await beat( ctx.pace.afterPageMs );

	await demoLongPress( guiding.getByRole( 'button' , { name : /Hold to finish/i } ) , ctx.pace );
	await waitForMainShell( ctx.electronApp );
	await presentDemoWindow( ctx.electronApp );
};

import { bundledCatalogPath } from '../support/profile';
import {
	isShowcaseFamily ,
	readBundledVendors,
} from '../support/catalog';
import { demoClick , demoLongPress , showDemoCursorAt } from '../support/mouse';
import { beat } from '../support/pace';
import { presentDemoWindow } from '../support/launch';
import { installDemoCursor } from '../support/cursor';
import {
	waitForGuiding ,
	waitForMainShell ,
	type DemoContext,
} from '../support/shell';
