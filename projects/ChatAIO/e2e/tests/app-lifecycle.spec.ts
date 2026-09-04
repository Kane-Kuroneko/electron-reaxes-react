/**
 * 关主窗必须整棵进程树退出；同一 userData 第二次启动应立刻退出并唤起已有窗。
 * 不用默认 fixture：closeChatAio 会 app.exit + kill pid，测不到僵尸。
 * 设计：docs/issues/close-without-tray-process-lingers.md 「怎么测」、docs/features/single-instance.md
 */

test.describe( 'app lifecycle' , () => {
	test.describe.configure( {
		timeout : 120_000,
	} );

	test( 'closing the main window exits the whole process tree' , async() => {
		test.skip( process.platform === 'darwin' , 'macOS 点 X 留 Dock，不退进程' );
		const launched = await launchChatAio( {
			mode : 'returning-user',
		} );
		const proc = launched.electronApp.process();
		const pid = proc.pid;
		if( !pid ) {
			throw new Error( 'electronApp.process().pid missing' );
		}
		try {
			await waitForWindowByUrl( launched.electronApp , 'MainView' , 60_000 );
			await waitForE2ESnapshot(
				launched.electronApp ,
				( snapshot ) => snapshot.kind === 'main' ,
				45_000,
			);
			/* DropdownView 是钉死 window-all-closed 的隐藏窗；没有它本用例盖不住根因。 */
			await waitForWindowByUrl( launched.electronApp , 'DropdownView' , 45_000 );

			const exitPromise = waitForProcessExit( proc , 10_000 , `ChatAIO pid=${ pid }` );
			try {
				await closeUserFacingBrowserWindow( launched.electronApp );
			} catch ( error ) {
				/* close() 触发 exit 后 Playwright evaluate 可能已经没 context；进程还活着则必须抛出。 */
				if( proc.exitCode === null && isPidAlive( pid ) ) {
					throw error;
				}
			}
			await exitPromise;
			await assertPidTreeGone( pid );
		} finally {
			if( isPidAlive( pid ) ) {
				await taskkillPidTree( pid );
			}
			await removeUserDataDir( launched.userDataDir );
		}
	} );

	test( 'second launch with the same userData exits and focuses the first window' , async() => {
		const launched = await launchChatAio( {
			mode : 'returning-user',
		} );
		const proc = launched.electronApp.process();
		const pidA = proc.pid;
		if( !pidA ) {
			throw new Error( 'electronApp.process().pid missing' );
		}
		let pidB : number | undefined;
		try {
			await waitForWindowByUrl( launched.electronApp , 'MainView' , 60_000 );
			await waitForE2ESnapshot(
				launched.electronApp ,
				( snapshot ) => snapshot.kind === 'main' ,
				45_000,
			);

			const child = spawnSecondChatAioInstance( {
				userDataDir : launched.userDataDir ,
				paths : launched.paths,
			} );
			pidB = child.pid;
			if( !pidB ) {
				throw new Error( 'second instance pid missing' );
			}
			const code = await waitForProcessExit( child , 15_000 , `second ChatAIO pid=${ pidB }` );
			expect( code ).toBe( 0 );
			expect( isPidAlive( pidA ) ).toBe( true );

			const state = await readUserFacingWindowState( launched.electronApp );
			expect( state ).not.toBeNull();
			expect( state?.minimized ).toBe( false );
			expect( state?.visible ).toBe( true );
		} finally {
			if( pidB && isPidAlive( pidB ) ) {
				await taskkillPidTree( pidB );
			}
			try {
				await launched.electronApp.evaluate( ( { app } ) => {
					( app as { __chatAIOQuitting? : boolean } ).__chatAIOQuitting = true;
					app.exit( 0 );
				} );
			} catch {
				/* 进程可能已退出 */
			}
			await waitForProcessExit( proc , 10_000 , `ChatAIO pid=${ pidA }` ).catch( async() => {
				await taskkillPidTree( pidA );
			} );
			await removeUserDataDir( launched.userDataDir );
		}
	} );
} );

import { test , expect } from '@playwright/test';
import { launchChatAio } from '../support/launch';
import {
	waitForE2ESnapshot ,
	waitForWindowByUrl,
} from '../support/app-probe';
import {
	assertPidTreeGone ,
	closeUserFacingBrowserWindow ,
	isPidAlive ,
	readUserFacingWindowState ,
	removeUserDataDir ,
	spawnSecondChatAioInstance ,
	taskkillPidTree ,
	waitForProcessExit,
} from '../support/app-lifecycle';
