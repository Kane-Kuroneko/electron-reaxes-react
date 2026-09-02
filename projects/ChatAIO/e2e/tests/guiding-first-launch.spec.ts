/**
 * 空画像首启应进入 GuidingView，而不是 MainView。
 * 对应 GuidingView 首启契约。
 */

testFirstLaunch( 'first launch shows GuidingView setup' , async( { mainWindow } ) => {
	await expect( mainWindow.getByTestId( TEST_IDS.guidingRoot ) ).toBeVisible();
	await expect( mainWindow.locator( '.guiding-kicker' ) ).toHaveText( 'ChatAIO' );
	await expect( mainWindow.locator( '.ant-steps' ) ).toBeVisible();
	await expect( mainWindow.locator( '.guiding-footer button' ).first() ).toBeVisible();
} );

import { expect , testFirstLaunch } from '../fixtures';
import { TEST_IDS } from '../support/selectors';
