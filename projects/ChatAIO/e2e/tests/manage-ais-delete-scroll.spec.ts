/**
 * 回归：Manage AIs 表格确认删除 / 撤销 / 表底 Save 后不得整表 remount，
 * 滚动容器 `.manage-ais-table` 的滚动位置必须保持。
 * 曾因 Table 挂了随 pendingDeleteAIIds 变化的 key（e35835056），每次确认删除滚动条弹回顶部。
 * sentinel 写在滚动容器的 dataset 上：remount 会重建该 DOM 节点，sentinel 即丢失。
 * 见 docs/features/manage-ais-table-ux.md
 */

const testManyAis = test.extend( {
	userAisPatch : async( {} , use ) => {
		await use( patchManyAisForScroll );
	},
} );

const TABLE_BODY_SELECTOR = '.manage-ais-table';

/** 给滚动容器打 sentinel 并滚到底，返回滚动后的 scrollTop。 */
const armTableBodySentinel = async( settings:Page ) => {
	return settings.evaluate( ( selector ) => {
		const body = document.querySelector( selector ) as HTMLElement | null;
		if( !body ) {
			throw new Error( 'Manage AIs table body not found' );
		}
		body.dataset.e2eSentinel = 'alive';
		body.scrollTop = body.scrollHeight;
		return {
			scrollTop : body.scrollTop ,
			scrollable : body.scrollHeight > body.clientHeight,
		};
	} , TABLE_BODY_SELECTOR );
};

const readTableBodyState = async( settings:Page ) => {
	return settings.evaluate( ( selector ) => {
		const body = document.querySelector( selector ) as HTMLElement | null;
		if( !body ) {
			throw new Error( 'Manage AIs table body not found' );
		}
		return {
			scrollTop : body.scrollTop ,
			sentinel : body.dataset.e2eSentinel ?? null,
		};
	} , TABLE_BODY_SELECTOR );
};

testManyAis( 'confirm delete and undo keep table scroll position (no remount)' , async( {
	electronApp ,
	mainWindow,
} ) => {
	await waitForMainRuntime( electronApp );
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );

	const armed = await armTableBodySentinel( settings );
	expect( armed.scrollable ).toBe( true );
	expect( armed.scrollTop ).toBeGreaterThan( 0 );

	/* 底部可见行：启用行在上、disabled 的 B 置底，scroll-20 紧邻底部。 */
	const targetId = 'custom-e2e-scroll-20';
	await markAiPendingDelete( settings , targetId );

	const afterDelete = await readTableBodyState( settings );
	expect( afterDelete.sentinel ).toBe( 'alive' );
	expect( afterDelete.scrollTop ).toBe( armed.scrollTop );

	await watchClick( manageAisRow( settings , targetId ).getByRole( 'button' , { name : 'Undo Delete' } ) );
	await expect( manageAisRow( settings , targetId ) ).not.toHaveClass( /ai-row--pending-delete/ );

	const afterUndo = await readTableBodyState( settings );
	expect( afterUndo.sentinel ).toBe( 'alive' );
	expect( afterUndo.scrollTop ).toBe( armed.scrollTop );
} );

testManyAis( 'table Save after pending delete keeps scroll position (no remount)' , async( {
	electronApp ,
	mainWindow,
} ) => {
	const settings = await openSettingsFromApplicationMenu( electronApp , mainWindow );
	await openManageAIs( settings );

	const armed = await armTableBodySentinel( settings );
	expect( armed.scrollable ).toBe( true );

	const targetId = 'custom-e2e-scroll-19';
	await markAiPendingDelete( settings , targetId );
	await expectTableDirty( settings );

	await watchClick( tableSave( settings ) );
	await waitForE2ESnapshot(
		electronApp ,
		( state ) => state.persistedAIIds.includes( targetId ) === false,
	);
	await expectTableIdle( settings );

	/* Save 删掉一行后 scrollHeight 变小，scrollTop 允许被浏览器收敛，但不得弹回顶部。 */
	const afterSave = await readTableBodyState( settings );
	expect( afterSave.sentinel ).toBe( 'alive' );
	expect( afterSave.scrollTop ).toBeGreaterThan( 0 );
} );

import { test , expect } from '../fixtures';
import {
	openSettingsFromApplicationMenu ,
	waitForE2ESnapshot ,
	waitForMainRuntime,
} from '../support/app-probe';
import { patchManyAisForScroll } from '../support/e2e-ais';
import {
	expectTableDirty ,
	expectTableIdle ,
	manageAisRow ,
	markAiPendingDelete ,
	openManageAIs ,
	tableSave,
} from '../support/settings-ui';
import { watchClick } from '../support/observe';
import type { Page } from '@playwright/test';
