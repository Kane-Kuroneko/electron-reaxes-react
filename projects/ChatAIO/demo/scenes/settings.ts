/**
 * Settings：Dev enhancer 先停在 Networks，直接扫全局代理四档，再 Manage AIs 看 preload / 按页代理。
 * 代理单选连点，只在 Manual 表单和 Edit 弹窗多停一拍。不拍 Dark。
 * 设计：docs/features/playwright-demo-script.md
 */

const GLOBAL_PROXY_RADIOS = [
	'Direct(No Proxy)' ,
	'Follow system proxy settings' ,
	'Select from proxy servers' ,
	'Manual proxy configuration',
] as const;

export const runSettingsScene = async( ctx:DemoContext ) => {
	await waitForMainShell( ctx.electronApp );
	const settings = await demoOpenSettings( ctx );
	await showNetworksIfNeeded( settings , ctx );

	for( const name of GLOBAL_PROXY_RADIOS ) {
		const linger = name === 'Manual proxy configuration'
			? ctx.pace.formHoldMs
			: ctx.pace.afterClickMs;
		await demoClick( settings.getByRole( 'radio' , {
			name ,
			exact : true,
		} ) , ctx.pace , {
			afterMs : linger,
		} );
	}
	await demoClick( settings.getByRole( 'radio' , {
		name : 'Direct(No Proxy)' ,
		exact : true,
	} ) , ctx.pace );

	await demoClick( settings.getByRole( 'menuitem' , { name : 'Manage AIs' } ) , ctx.pace );
	const vendors = await readBundledVendors( bundledCatalogPath( ctx.chatAioRoot ) );
	const gemini = vendorByFamily( vendors , 'gemini' );
	const geminiRow = settings.locator( `tr[data-row-key="${ gemini.id }"]` );
	await geminiRow.waitFor( {
		state : 'visible' ,
		timeout : 20_000,
	} );
	await beat( ctx.pace.afterPageMs );

	await demoClick( geminiRow.getByRole( 'button' , { name : 'Edit' } ) , ctx.pace );
	const dialog = settings.getByRole( 'dialog' , {
		name : 'Edit AI Page',
	} );
	await dialog.waitFor( {
		state : 'visible' ,
		timeout : 15_000,
	} );
	await dialog.getByRole( 'radio' , {
		name : 'Follow Global Setting' ,
		exact : true,
	} ).waitFor( {
		state : 'visible' ,
		timeout : 10_000,
	} );
	await beat( ctx.pace.formHoldMs );
	await demoClick( dialog.getByRole( 'button' , { name : 'Cancel' } ) , ctx.pace );
	await dialog.waitFor( {
		state : 'hidden' ,
		timeout : 10_000,
	} );

	await demoClick( settings.getByTestId( TEST_IDS.settingsFooterDone ) , ctx.pace );
	await waitForE2ESnapshot(
		ctx.electronApp ,
		( state ) => state.kind === 'main' && state.settingsViewOpened === false ,
		30_000,
	);
	await demoMoveTo( getMainWindow( ctx.electronApp ).getByTestId( TEST_IDS.currentAiBadge ) , ctx.pace );
};

const showNetworksIfNeeded = async( settings:Page , ctx:DemoContext ) => {
	const proxyTitle = settings.getByText( 'Global Proxy' , {
		exact : true,
	} );
	try {
		await proxyTitle.waitFor( {
			state : 'visible' ,
			timeout : 3_000,
		} );
		return;
	} catch {
		/* enhancer 若没停在 Networks，再点一次侧栏 */
	}
	await demoClick( settings.getByRole( 'menuitem' , { name : 'Networks' } ) , ctx.pace );
	await proxyTitle.waitFor( {
		state : 'visible' ,
		timeout : 10_000,
	} );
};

import { bundledCatalogPath } from '../support/profile';
import { readBundledVendors , vendorByFamily } from '../support/catalog';
import { demoClick , demoMoveTo } from '../support/mouse';
import { beat } from '../support/pace';
import {
	demoOpenSettings ,
	getMainWindow ,
	waitForMainShell ,
	type DemoContext,
} from '../support/shell';
import { waitForE2ESnapshot } from '../../e2e/support/app-probe';
import { TEST_IDS } from '../../e2e/support/selectors';
import type { Page } from '@playwright/test';
