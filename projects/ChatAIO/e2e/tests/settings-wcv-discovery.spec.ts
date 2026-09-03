/**
 * Playwright 1.60+ 把 WebContentsView 也收进 electronApp.windows()。
 * 打开 Settings 后应能拿到 SettingsView Page 和 settings-root。
 * 不必为了点 Settings 把生产 WCV 改成 BrowserWindow。
 * 见 docs/features/e2e-playwright.md
 */

test( 'opening Settings exposes a Playwright Page for the Settings WCV' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await expect( settings.getByTestId( TEST_IDS.settingsRoot ) ).toBeVisible();
	expect( pageUrlIncludes( settings , 'SettingsView' ) ).toBe( true );
} );

import { test , expect } from '../fixtures';
import {
	openSettingsFromApplicationMenu ,
	pageUrlIncludes,
} from '../support/app-probe';
import { TEST_IDS } from '../support/selectors';
