/**
 * Settings 页脚与 Manage AIs 表底两套 dirty / 弹窗即时写盘。
 * Settings 是中心 WCV，用 waitForSettingsPage，不要改成 BrowserWindow。
 * 见 docs/features/manage-ais-save-scopes.md
 */

test( 'toggling an AI Enabled switch dirties the table Save but not the footer' , async( {
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
	const dialog = manageAisDialog( settings , 'Edit AI Page' );
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
	const dialog = manageAisDialog( settings , 'Edit AI Page' );
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

test( 'changing theme persists immediately and does not dirty table Save' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await expectTableIdle( settings );
	await openGeneral( settings );
	await watchClick( settings.getByRole( 'radio' , { name : 'Dark' , exact : true } ) );
	await expect( settings.getByRole( 'radio' , { name : 'Dark' , exact : true } ) ).toHaveAttribute( 'aria-checked' , 'true' );
	await expect( settings.getByTestId( TEST_IDS.settingsRoot ) ).toHaveAttribute( 'data-theme' , 'dark' );
	await openManageAIs( settings );
	await expectTableIdle( settings );
	await expectFooterIdle( settings );
} );

test( 'table Undo drops AI drafts while autosaved theme stays' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openGeneral( settings );
	await watchClick( settings.getByRole( 'radio' , { name : 'Dark' , exact : true } ) );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_A.id ) );
	await expectTableDirty( settings );
	await watchClick( tableUndo( settings ) );
	await expectTableIdle( settings );
	await expect( enabledSwitchInRow( settings , E2E_AI_A.id ) ).toBeChecked();
	await openGeneral( settings );
	await expect( settings.getByRole( 'radio' , { name : 'Dark' , exact : true } ) ).toHaveAttribute( 'aria-checked' , 'true' );
} );

test( 'Done does not drop table AI drafts' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_A.id ) );
	await expectTableDirty( settings );
	await exitSettingsWithoutSave( electronApp , settings );

	const again = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( again );
	await expectTableDirty( again );
	await expect( enabledSwitchInRow( again , E2E_AI_A.id ) ).not.toBeChecked();
} );

test( 'Startup AI Page radio persists immediately and does not dirty the table' , async( {
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
	await expect(
		settings.getByTestId( TEST_IDS.startupAiPageFirst ).locator( 'xpath=ancestor::label' ).getByRole( 'radio' ),
	).toHaveAttribute( 'aria-checked' , 'true' );
	await expectFooterIdle( settings );
	await expectTableIdle( settings );
} );

test( 'catalog check is blocked while the AI table is dirty' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( enabledSwitchInRow( settings , E2E_AI_A.id ) );
	await expectTableDirty( settings );
	const checkButton = checkAiCatalogButton( settings );
	await watchClick( checkButton );
	/* 脏挡板是同步的；3s 内没有文案多半是已经去打 GitHub。不要用默认 20s expect。 */
	await expect(
		settings.getByText( 'Save or discard AI page changes before checking the AI catalog' ),
	).toBeVisible( { timeout : 3_000 } );
	expect( await checkButton.getAttribute( 'aria-busy' ) ).not.toBe( 'true' );
} );

test( 'Add AI Page persists immediately without lighting table Save' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	const before = await readUserAisFile( userDataDir );
	const addButton = settings.getByRole( 'button' , { name : 'Add AI Page' } );
	await expect( addButton ).toBeEnabled();
	await watchClick( addButton );
	const dialog = manageAisDialog( settings , 'Add AI Page' );
	await expect( dialog ).toBeVisible();
	const boxes = dialog.getByRole( 'textbox' );
	const nameBox = boxes.nth( 0 );
	await expect( nameBox ).toHaveValue( '' );
	await expect( nameBox ).toHaveAttribute( 'placeholder' , /./ );
	await nameBox.fill( 'E2E Echo' );
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

test( 'Add without typing a name saves the placeholder default' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	const before = await readUserAisFile( userDataDir );
	await watchClick( settings.getByRole( 'button' , { name : 'Add AI Page' } ) );
	const dialog = manageAisDialog( settings , 'Add AI Page' );
	await expect( dialog ).toBeVisible();
	const boxes = dialog.getByRole( 'textbox' );
	const nameBox = boxes.nth( 0 );
	await expect( nameBox ).toHaveValue( '' );
	const placeholder = await nameBox.getAttribute( 'placeholder' );
	expect( placeholder ).toBeTruthy();
	await boxes.nth( 1 ).fill( 'about:blank' );
	await watchClick( dialogSave( settings ) );
	await expect( dialog ).toBeHidden();
	await expectTableIdle( settings );
	await expectFooterIdle( settings );
	await expect( settings.getByText( placeholder! ) ).toBeVisible();
	const after = await readUserAisFile( userDataDir );
	expect( after.ais.length ).toBe( before.ais.length + 1 );
	expect( after.ais.some( ( ai ) => ai.label === placeholder ) ).toBe( true );
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
	/* Clone 打开的弹窗是 mode:'add'，标题是 Add AI Page（见 changeCloneAIModalVisible）。 */
	const dialog = manageAisDialog( settings , 'Add AI Page' );
	await expect( dialog ).toBeVisible();
	const nameBox = dialog.getByRole( 'textbox' ).first();
	await expect( nameBox ).toHaveValue( '' );
	await expect( nameBox ).toHaveAttribute( 'placeholder' , /./ );
	await nameBox.fill( 'E2E Charlie Copy' );
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

	/* Clone 的新条目必须落在母项 C 下方（真实序），而不是表底。 */
	const charlieIndex = after.ais.findIndex( ( ai ) => ai.id === E2E_AI_C.id );
	expect( after.ais[charlieIndex + 1]?.id ).toBe( added!.id );

	/* 展示序同样紧邻母项（B 是 committed disabled 置底，不影响 C 段）。 */
	const displayedIds = await displayedManageAisIds( settings );
	expect( displayedIds[displayedIds.indexOf( E2E_AI_C.id ) + 1] ).toBe( added!.id );

	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.enabledAIIds.includes( added!.id ),
	);
} );

test( 'pressing Enter in a modal input saves immediately' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	await watchClick( manageAisRow( settings , E2E_AI_C.id ).getByRole( 'button' , { name : 'Edit' } ) );
	const dialog = manageAisDialog( settings , 'Edit AI Page' );
	await expect( dialog ).toBeVisible();
	const nameBox = dialog.getByRole( 'textbox' ).first();
	await nameBox.fill( 'E2E Charlie Enter' );
	await nameBox.press( 'Enter' );
	await expect( dialog ).toBeHidden();
	await expectTableIdle( settings );
	await expect( manageAisRow( settings , E2E_AI_C.id ) ).toContainText( 'E2E Charlie Enter' );
	const disk = await readUserAisFile( userDataDir );
	expect( disk.ais.find( ( ai ) => ai.id === E2E_AI_C.id )?.label ).toBe( 'E2E Charlie Enter' );
} );

test( 'Enter does not save when the form is invalid (empty custom URL)' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	const before = await readUserAisFile( userDataDir );
	await watchClick( settings.getByRole( 'button' , { name : 'Add AI Page' } ) );
	const dialog = manageAisDialog( settings , 'Add AI Page' );
	await expect( dialog ).toBeVisible();
	const boxes = dialog.getByRole( 'textbox' );
	await boxes.nth( 0 ).fill( 'E2E Invalid' );
	/* custom family 默认 URL 为空：Enter 不得关窗写盘，应报错留在弹窗。 */
	await boxes.nth( 1 ).fill( '' );
	await boxes.nth( 0 ).press( 'Enter' );
	await expect( settings.getByText( 'URL is required for custom AI' ).first() ).toBeVisible();
	await expect( dialog ).toBeVisible();
	const after = await readUserAisFile( userDataDir );
	expect( after.ais.length ).toBe( before.ais.length );
	await watchClick( dialogCancel( settings ) );
	await expect( dialog ).toBeHidden();
} );

test( 'Save / Enter do not persist when AI name is empty' , async( {
	electronApp ,
	mainWindow ,
	userDataDir,
} ) => {
	/* label 是同 family 多页之间唯一的区分（厂商靠 logo），Edit 清空必须拦。Add/Clone 空着保存走 placeholder，见下一条。 */
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );
	const before = await readUserAisFile( userDataDir );
	await watchClick( manageAisRow( settings , E2E_AI_C.id ).getByRole( 'button' , { name : 'Edit' } ) );
	const dialog = manageAisDialog( settings , 'Edit AI Page' );
	await expect( dialog ).toBeVisible();
	/* name 列渲染 logo + label；Edit 清空后的拒绝路径 */
	const nameBox = dialog.getByRole( 'textbox' ).first();
	await nameBox.fill( '   ' );
	await nameBox.press( 'Enter' );
	await expect( settings.getByText( 'AI name is required' ).first() ).toBeVisible();
	await expect( dialog ).toBeVisible();
	await watchClick( dialogSave( settings ) );
	await expect( dialog ).toBeVisible();
	const after = await readUserAisFile( userDataDir );
	expect( after.ais.find( ( ai ) => ai.id === E2E_AI_C.id )?.label ).toBe(
		before.ais.find( ( ai ) => ai.id === E2E_AI_C.id )?.label,
	);
	await watchClick( dialogCancel( settings ) );
	await expect( dialog ).toBeHidden();
	/* 表格 name 列带供应商 logo 槽 */
	await expect( manageAisRow( settings , E2E_AI_C.id ).locator( '[data-vendor]' ).first() ).toBeVisible();
} );

import { test , expect } from '../fixtures';
import { exitSettingsWithoutSave , openSettingsFromApplicationMenu , waitForE2ESnapshot } from '../support/app-probe';
import { E2E_AI_A , E2E_AI_B , E2E_AI_C , isSeededE2EAIId } from '../support/e2e-ais';
import { watchClick } from '../support/observe';
import { TEST_IDS } from '../support/selectors';
import { readUserAisFile } from '../support/user-ais-file';
import {
	checkAiCatalogButton ,
	dialogCancel ,
	dialogSave ,
	displayedManageAisIds ,
	enabledSwitchInRow ,
	expectFooterIdle ,
	expectTableDirty ,
	expectTableIdle ,
	manageAisDialog ,
	manageAisRow ,
	openGeneral ,
	openManageAIs ,
	tableSave ,
	tableUndo,
} from '../support/settings-ui';
