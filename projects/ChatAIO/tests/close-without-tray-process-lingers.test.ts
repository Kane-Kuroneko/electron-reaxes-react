/**
 * 禁用托盘后点 X 必须结束进程，不能 hide。
 * 契约见 docs/issues/close-without-tray-process-lingers.md。
 */

describe( 'shouldMinimizeMainWindowToTray' , () => {
	it( '托盘显示且 close_to_tray 且图标仍在 → hide' , () => {
		assert.equal( shouldMinimizeMainWindowToTray( {
			showTray : true ,
			closeToTray : true ,
			trayActive : true ,
			quitting : false,
		} ) , true );
	} );

	it( '禁用托盘后点 X 不得 hide（否则进程无入口残留）' , () => {
		assert.equal( shouldMinimizeMainWindowToTray( {
			showTray : false ,
			closeToTray : false ,
			trayActive : false ,
			quitting : false,
		} ) , false );
	} );

	it( 'show_tray 开但 close_to_tray 关 → 不得 hide' , () => {
		assert.equal( shouldMinimizeMainWindowToTray( {
			showTray : true ,
			closeToTray : false ,
			trayActive : true ,
			quitting : false,
		} ) , false );
	} );

	it( 'settings 仍写 show_tray 但 tray 已被 destroy → 不得 hide' , () => {
		assert.equal( shouldMinimizeMainWindowToTray( {
			showTray : true ,
			closeToTray : true ,
			trayActive : false ,
			quitting : false,
		} ) , false );
	} );

	it( '正在退出时不得 preventDefault hide' , () => {
		assert.equal( shouldMinimizeMainWindowToTray( {
			showTray : true ,
			closeToTray : true ,
			trayActive : true ,
			quitting : true,
		} ) , false );
	} );
} );

describe( 'shouldExitAppAfterWindowClosed' , () => {
	it( 'Windows：用户窗清零（主窗已关，只剩隐藏辅助窗）→ 退出' , () => {
		assert.equal( shouldExitAppAfterWindowClosed( {
			platform : 'win32' ,
			quitting : false ,
			remainingUserFacingCount : 0,
		} ) , true );
	} );

	it( 'Windows：主窗还在（含 hide 到托盘）→ 不退出' , () => {
		assert.equal( shouldExitAppAfterWindowClosed( {
			platform : 'win32' ,
			quitting : false ,
			remainingUserFacingCount : 1,
		} ) , false );
	} );

	it( 'macOS：用户窗清零也不退（留 Dock）' , () => {
		assert.equal( shouldExitAppAfterWindowClosed( {
			platform : 'darwin' ,
			quitting : false ,
			remainingUserFacingCount : 0,
		} ) , false );
	} );

	it( '正在退出时不再次 exit' , () => {
		assert.equal( shouldExitAppAfterWindowClosed( {
			platform : 'win32' ,
			quitting : true ,
			remainingUserFacingCount : 0,
		} ) , false );
	} );
} );

describe( 'isUserFacingBrowserWindow' , () => {
	it( '有 parent 的 Floating 不算用户实例' , () => {
		assert.equal( isUserFacingBrowserWindow( {
			isDestroyed : () => false ,
			isAlwaysOnTop : () => true ,
			getParentWindow : () => ( {} ),
		} ) , false );
	} );

	it( 'alwaysOnTop 的 Dropdown 不算用户实例' , () => {
		assert.equal( isUserFacingBrowserWindow( {
			isDestroyed : () => false ,
			isAlwaysOnTop : () => true ,
			getParentWindow : () => null,
		} ) , false );
	} );

	it( 'Main / Guiding：无 parent、非 alwaysOnTop' , () => {
		assert.equal( isUserFacingBrowserWindow( {
			isDestroyed : () => false ,
			isAlwaysOnTop : () => false ,
			getParentWindow : () => null,
		} ) , true );
	} );
} );

import { shouldMinimizeMainWindowToTray } from '#main/services/app-quit/should-minimize-to-tray.utility';
import {
	isUserFacingBrowserWindow ,
	shouldExitAppAfterWindowClosed,
} from '#main/services/app-quit/should-exit-after-window-closed.utility';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
