/**
 * 列筛选：不计 dirty、不写盘；空表仍保住 portal Input（可继续输入）。
 * 对应 docs/features/manage-ais-table-ux.md
 */

test( 'column filter hides rows without dirtying or writing disk' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const before = await readUserAisFile( userDataDir );
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await openManageAisColumnFilter( settings , 'label' );
	await manageAisColumnFilterInput( settings , 'label' ).fill( 'Charlie' );
	expect( await displayedManageAisIds( settings ) ).toEqual( [ E2E_AI_C.id ] );
	await expectTableIdle( settings );
	await expectFooterIdle( settings );

	const after = await readUserAisFile( userDataDir );
	expect( persistedIdsOf( after ) ).toEqual( persistedIdsOf( before ) );
} );

test( 'empty filter result keeps the portal input mounted' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await openManageAisColumnFilter( settings , 'label' );
	const nameInput = manageAisColumnFilterInput( settings , 'label' );
	await nameInput.fill( 'zzzz-no-match' );
	await expect( manageAisVisibleRows( settings ) ).toHaveCount( 0 );
	await expect( nameInput ).toBeVisible();
	await nameInput.focus();
	await nameInput.pressSequentially( 'x' );
	await expect( nameInput ).toHaveValue( 'zzzz-no-matchx' );
	await expectTableIdle( settings );

	await openManageAisColumnFilter( settings , 'AI_family' );
	const familyInput = manageAisColumnFilterInput( settings , 'AI_family' );
	await familyInput.fill( 'chatgpt' );
	await expect( manageAisVisibleRows( settings ) ).toHaveCount( 0 );
	await expect( nameInput ).toBeVisible();
	await expect( familyInput ).toBeVisible();
	await expect( nameInput ).toHaveValue( 'zzzz-no-matchx' );
} );

import { test , expect } from '../fixtures';
import { openSettingsFromApplicationMenu } from '../support/app-probe';
import { E2E_AI_C } from '../support/e2e-ais';
import {
	displayedManageAisIds ,
	expectFooterIdle ,
	expectTableIdle ,
	manageAisColumnFilterInput ,
	manageAisVisibleRows ,
	openManageAisColumnFilter ,
	openManageAIs,
} from '../support/settings-ui';
import { persistedIdsOf , readUserAisFile } from '../support/user-ais-file';
