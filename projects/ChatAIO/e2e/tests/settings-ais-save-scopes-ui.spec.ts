/**
 * Settings 页脚与 Manage AIs 表底两套 dirty / 弹窗即时写盘。
 * Settings 是中心 WCV，用 waitForSettingsPage，不要改成 BrowserWindow。
 * 见 docs/features/manage-ais-save-scopes.md
 */

test( 'toggling an AI Enabled switch dirties the table Save but not footer Apply' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_A.id ) );
	await expectFooterIdle( settings );
	await expectTableDirty( settings );
} );

test( 'modal Save renames without lighting table Save' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( manageAisRow( settings , E2E_AI_C.id ).getByRole( 'button' , { name : 'Edit' } ) );
	const dialog = settings.getByRole( 'dialog' );
	await expect( dialog ).toBeVisible();
	const nameBox = dialog.getByRole( 'textbox' ).first();
	await nameBox.fill( 'E2E Charlie Renamed' );
	await watchClick( dialogSave( settings ) );
	await expect( dialog ).toBeHidden();
	await expectTableIdle( settings );
	await expectFooterIdle( settings );
	await expect( manageAisRow( settings , E2E_AI_C.id ) ).toContainText( 'E2E Charlie Renamed' );

	const disk = await readUserAisFile( userDataDir );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_C.id )?.label ).toBe( 'E2E Charlie Renamed' );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_C.id )?.disabled ).not.toBe( true );
} );

test( 'modal Cancel leaves store and disk unchanged' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	const before = await readUserAisFile( userDataDir );
	await watchClick( manageAisRow( settings , E2E_AI_A.id ).getByRole( 'button' , { name : 'Edit' } ) );
	const dialog = settings.getByRole( 'dialog' );
	await dialog.getByRole( 'textbox' ).first().fill( 'Should Not Persist' );
	await watchClick( dialogCancel( settings ) );
	await expect( dialog ).toBeHidden();
	await expect( manageAisRow( settings , E2E_AI_A.id ) ).toContainText( E2E_AI_A.label );
	await expectTableIdle( settings );
	const after = await readUserAisFile( userDataDir );
	expect( after.ais.find( ( ai ) => ai.id === E2E_AI_A.id )?.label ).toBe(
		before.ais.find( ( ai ) => ai.id === E2E_AI_A.id )?.label,
	);
} );

test( 'changing theme dirties footer Apply but not table Save' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await expectTableIdle( settings );
	await openGeneral( settings );
	await watchClick( settings.getByRole( 'radio' , { name : 'Dark' } ) );
	await expectFooterDirty( settings );
	await openManageAIs( settings );
	await expectTableIdle( settings );
} );

test( 'table Undo drops AI drafts while footer dirty stays' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openGeneral( settings );
	await watchClick( settings.getByRole( 'radio' , { name : 'Dark' } ) );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_A.id ) );
	await expectTableDirty( settings );
	await expectFooterDirty( settings );
	await watchClick( tableUndo( settings ) );
	await expectTableIdle( settings );
	await expect( enabledSwitchInRow( settings , E2E_AI_A.id ) ).toBeChecked();
	await expectFooterDirty( settings );
} );

test( 'footer Discard does not drop table AI drafts' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_A.id ) );
	await openGeneral( settings );
	await watchClick( settings.getByRole( 'radio' , { name : 'Dark' } ) );
	await watchClick( footerDiscard( settings ) );
	await expectFooterIdle( settings );
	await expect( settings.getByRole( 'radio' , { name : 'Light' , exact : true } ) ).toBeChecked();
	await openManageAIs( settings );
	await expectTableDirty( settings );
	await expect( enabledSwitchInRow( settings , E2E_AI_A.id ) ).not.toBeChecked();
} );

test( 'Startup AI Page radio dirties footer not table' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await expectFooterIdle( settings );
	await settings.evaluate( () => {
		const node = document.querySelector( '[data-testid="startup-ai-page-first"]' );
		if( !node ) {
			throw new Error( 'startup-ai-page-first missing' );
		}
		const target = ( node.closest( 'label' ) || node ) as HTMLElement;
		target.click();
	} );
	await expect( settings.getByTestId( TEST_IDS.settingsFooterApply ) ).toHaveAttribute( 'data-dirty' , 'true' );
	await expectFooterDirty( settings );
	await expectTableIdle( settings );
} );

test( 'catalog check is blocked while the AI table is dirty' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_A.id ) );
	await watchClick( settings.getByRole( 'button' , { name : 'Check AI catalog' } ) );
	await expect(
		settings.getByText( 'Save or discard AI page changes before checking the AI catalog' ),
	).toBeVisible();
} );

test( 'Add AI Page persists immediately without lighting table Save' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	const before = await readUserAisFile( userDataDir );
	await watchClick( settings.getByRole( 'button' , { name : 'Add AI Page' } ) );
	const dialog = settings.getByRole( 'dialog' );
	await expect( dialog ).toBeVisible();
	const boxes = dialog.getByRole( 'textbox' );
	await boxes.nth( 0 ).fill( 'E2E Echo' );
	await boxes.nth( 1 ).fill( 'about:blank' );
	await watchClick( dialogSave( settings ) );
	await expect( dialog ).toBeHidden();
	await expectTableIdle( settings );
	await expectFooterIdle( settings );
	await expect( settings.getByText( 'E2E Echo' ) ).toBeVisible();
	const after = await readUserAisFile( userDataDir );
	expect( after.ais.length ).toBe( before.ais.length + 1 );
	expect( after.ais.some( ( ai ) => ai.label === 'E2E Echo' ) ).toBe( true );
} );

test( 'table Save writes Enabled flags and leaves footer idle' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_B.id ) );
	await expectTableDirty( settings );
	await watchClick( tableSave( settings ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.enabledAIIds.includes( E2E_AI_B.id ),
	);
	await expectTableIdle( settings );
	await expectFooterIdle( settings );
	const disk = await readUserAisFile( userDataDir );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_B.id )?.disabled ).not.toBe( true );
} );

test( 'Clone persists a new id immediately without lighting table Save' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	const before = await readUserAisFile( userDataDir );
	await watchClick( manageAisRow( settings , E2E_AI_C.id ).getByRole( 'button' , { name : 'Clone' } ) );
	const dialog = settings.getByRole( 'dialog' );
	await expect( dialog ).toBeVisible();
	await dialog.getByRole( 'textbox' ).first().fill( 'E2E Charlie Copy' );
	await watchClick( dialogSave( settings ) );
	await expect( dialog ).toBeHidden();
	await expectTableIdle( settings );
	await expectFooterIdle( settings );
	await expect( settings.getByText( 'E2E Charlie Copy' ) ).toBeVisible();

	const after = await readUserAisFile( userDataDir );
	expect( after.ais.length ).toBe( before.ais.length + 1 );
	const added = after.ais.find( ( ai ) => isSeededE2EAIId( ai.id ) === false );
	expect( added?.label ).toBe( 'E2E Charlie Copy' );
	expect( added?.url ).toBe( 'about:blank' );
	expect( added?.id ).toBeTruthy();

	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.enabledAIIds.includes( added!.id ),
	);
} );

import { test , expect } from '../fixtures';
import { openSettingsFromApplicationMenu , waitForE2ESnapshot } from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , isSeededE2EAIId } from '../support/e2e-ais';
import { watchClick } from '../support/observe';
import { TEST_IDS } from '../support/selectors';
import { readUserAisFile } from '../support/user-ais-file';
import {
	dialogCancel ,
	dialogSave ,
	enabledSwitchInRow ,
	expectFooterDirty ,
	expectFooterIdle ,
	expectTableDirty ,
	expectTableIdle ,
	footerDiscard ,
	manageAisRow ,
	openGeneral ,
	openManageAIs ,
	tableSave ,
	tableUndo,
} from '../support/settings-ui';
