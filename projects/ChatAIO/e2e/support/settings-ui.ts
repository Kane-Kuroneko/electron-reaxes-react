/**
 * Settings WCV 上 Manage AIs / 页脚的稳定 locator。
 * seed 语言是 en-US。Save & Exit 不是表底 Save。
 * 设计：docs/features/manage-ais-save-scopes.md
 */

export const openManageAIs = async( settings:Page ) => {
	await watchClick( settings.getByRole( 'menuitem' , { name : 'Manage AIs' } ) );
	await expect( settings.getByRole( 'switch' ).first() ).toBeVisible();
	return settings;
};

export const openGeneral = async( settings:Page ) => {
	await watchClick( settings.getByRole( 'menuitem' , { name : 'General' } ) );
	await expect( settings.getByText( 'Appearance' , { exact : true } ) ).toBeVisible();
	return settings;
};

export const footerApply = ( settings:Page ) => {
	return settings.getByTestId( TEST_IDS.settingsFooterApply );
};

export const footerDiscard = ( settings:Page ) => {
	return settings.getByRole( 'button' , { name : 'Discard Changes' } );
};

export const tableSave = ( settings:Page ) => {
	return settings.getByTestId( TEST_IDS.manageAisSave );
};

export const tableUndo = ( settings:Page ) => {
	return settings.getByTestId( TEST_IDS.manageAisUndo );
};

export const manageAisRow = ( settings:Page , aiId:string ) => {
	return settings.locator( `tr[data-row-key="${ aiId }"]` );
};

export const enabledSwitchInRow = ( settings:Page , aiId:string ) => {
	return manageAisRow( settings , aiId ).getByRole( 'switch' );
};

export const manageAisVisibleRows = ( settings:Page ) => {
	/* scroll.y 的 antd 表会多一行 hidden measure（data-row-key=example），不要用裸 tbody。 */
	return settings.locator( '.manage-ais-table .ant-table-body tbody tr[data-row-key]' );
};

export const displayedManageAisIds = async( settings:Page ) => {
	const rows = manageAisVisibleRows( settings );
	await expect( rows.first() ).toBeVisible();
	const count = await rows.count();
	const ids : string[] = [];
	for( let i = 0; i < count; i++ ) {
		const id = await rows.nth( i ).getAttribute( 'data-row-key' );
		if( id ) {
			ids.push( id );
		}
	}
	return ids;
};

export const expectFooterIdle = async( settings:Page ) => {
	await expect( footerApply( settings ) ).toBeDisabled();
};

export const expectTableIdle = async( settings:Page ) => {
	await expect( tableSave( settings ) ).toBeDisabled();
};

export const expectTableDirty = async( settings:Page ) => {
	await expect( tableSave( settings ) ).toBeEnabled();
};

export const expectFooterDirty = async( settings:Page ) => {
	await expect( footerApply( settings ) ).toBeEnabled();
};

export const dialogSave = ( settings:Page ) => {
	return settings.getByRole( 'dialog' ).getByRole( 'button' , { name : 'Save' , exact : true } );
};

export const dialogCancel = ( settings:Page ) => {
	return settings.getByRole( 'dialog' ).getByRole( 'button' , { name : 'Cancel' } );
};

export const dragHandleInRow = ( settings:Page , aiId:string ) => {
	return manageAisRow( settings , aiId ).getByTestId( TEST_IDS.manageAisDragHandle );
};

/**
 * Manage AIs 表内左键拖启用行。PointerSensor distance=1；不要 locator.dragTo()。
 * 未启用行禁拖，源/目标都应是启用行。
 */
export const leftClickDragManageAisRow = async(
	settings : Page ,
	sourceAiId : string ,
	targetAiId : string,
) => {
	const source = dragHandleInRow( settings , sourceAiId );
	const target = dragHandleInRow( settings , targetAiId );
	await expect( source ).toBeVisible();
	await expect( target ).toBeVisible();
	if( isE2EWatch() ) {
		try {
			await source.highlight();
		} catch {
			/* ignore */
		}
		await observePause();
	}
	const sourceBox = await source.boundingBox();
	const targetBox = await target.boundingBox();
	if( !sourceBox || !targetBox ) {
		throw new Error( `Manage AIs drag missing box: ${ sourceAiId } → ${ targetAiId }` );
	}
	const fromX = sourceBox.x + sourceBox.width / 2;
	const fromY = sourceBox.y + sourceBox.height / 2;
	const toX = targetBox.x + targetBox.width / 2;
	const toY = targetBox.y + targetBox.height / 2;
	await settings.mouse.move( fromX , fromY );
	await settings.mouse.down();
	await settings.mouse.move( fromX , fromY + 8 , { steps : 4 } );
	await settings.mouse.move( toX , toY , { steps : 20 } );
	await settings.mouse.move( toX , toY );
	await settings.mouse.up();
	await observePause();
};

export const openManageAisColumnFilter = async(
	settings : Page ,
	filterKey : 'label' | 'AI_family' | 'url',
) => {
	const headerName = {
		label : /AI name/i ,
		AI_family : /AI family/i ,
		url : /AI URL/i,
	}[filterKey];
	/* antd scroll 表会复制一格 measure cell，不能裸用 data-manage-ais-filter-trigger。 */
	await watchClick(
		settings.getByRole( 'columnheader' , { name : headerName } ).locator( `[data-manage-ais-filter-trigger="${ filterKey }"]` ),
	);
	await expect( manageAisColumnFilterInput( settings , filterKey ) ).toBeVisible();
};

export const manageAisColumnFilterInput = (
	settings : Page ,
	filterKey : 'label' | 'AI_family' | 'url',
) => {
	const placeholder = {
		label : 'Search AI name' ,
		AI_family : 'Search AI family' ,
		url : 'Search AI URL',
	}[filterKey];
	return settings.getByPlaceholder( placeholder );
};

export const markAiPendingDelete = async( settings:Page , aiId:string ) => {
	await watchClick( manageAisRow( settings , aiId ).getByRole( 'button' , { name : 'Delete' } ) );
	const popover = settings.locator( '.delete-ai-popover' );
	await expect( popover ).toBeVisible();
	await watchClick( popover.getByRole( 'button' , { name : 'Delete' } ) );
	await expect( manageAisRow( settings , aiId ) ).toHaveClass( /ai-row--pending-delete/ );
};

import { isE2EWatch , observePause , watchClick } from './observe';
import { TEST_IDS } from './selectors';
import { expect , type Page } from '@playwright/test';
