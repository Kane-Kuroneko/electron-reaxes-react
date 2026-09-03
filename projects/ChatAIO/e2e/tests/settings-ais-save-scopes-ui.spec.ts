/**
 * Settings 页脚与 Manage AIs 表底两套 dirty：点表格 Enabled 只点亮表底 Save。
 * Settings 是中心 WCV，用 waitForSettingsPage，不要改成 BrowserWindow。
 * 见 docs/features/manage-ais-save-scopes.md
 */

test( 'toggling an AI Enabled switch dirties the table Save but not footer Apply' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await settings.getByRole( 'menuitem' , { name : 'Manage AIs' } ).click();
	const enabledSwitch = settings.getByRole( 'switch' ).first();
	await expect( enabledSwitch ).toBeVisible();
	await enabledSwitch.click();

	await expect( settings.getByRole( 'button' , { name : 'Apply' , exact : true } ) ).toBeDisabled();
	await expect( settings.getByRole( 'button' , { name : 'Save' , exact : true } ) ).toBeEnabled();
} );

import { test , expect } from '../fixtures';
import { openSettingsFromApplicationMenu } from '../support/app-probe';
