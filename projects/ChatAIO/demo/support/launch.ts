/**
 * 演示用 _electron.launch。持久 demo/.profile，不走 E2E mkdtemp / about:blank。
 * 仍设 CHATAIO_E2E=1：隔离 userData、dist renderer、探针。另设 CHATAIO_DEMO=1。
 * 启动前把画像钉成浅色英文 + 六家 preload；向导页由 run.ts 在 preroll 前再点一次 Light。
 * 窗口只从 1920×1080 / 1600×900 / 1280×720 里取能放进 workArea 的最大一档。
 * 设计：docs/features/playwright-demo-record.md 、docs/features/playwright-demo-script.md
 */

export type DemoLaunchMode = 'returning-user' | 'first-launch';

export type LaunchedDemo = {
	electronApp : ElectronApplication;
	userDataDir : string;
	paths : ChatAioE2EPaths;
};

export const launchDemoApp = async( options:{
	mode : DemoLaunchMode;
	userDataDir : string;
	resetProfile? : boolean;
} ):Promise<LaunchedDemo> => {
	const paths = resolveChatAioE2EPaths();
	if( fs.existsSync( paths.electronExecutable ) === false ) {
		throw new Error( `Electron binary missing: ${ paths.electronExecutable }` );
	}

	if( options.resetProfile ) {
		await resetDemoProfile( options.userDataDir );
	}
	await fs.promises.mkdir( options.userDataDir , { recursive : true } );

	if( options.mode === 'returning-user' ) {
		await ensureReturningDemoProfile( options.userDataDir , paths.chatAioRoot );
	}
	await forceDemoProfileLightTheme( options.userDataDir );

	const launchEnv : Record<string , string> = {};
	for( const [ key , value ] of Object.entries( process.env ) ) {
		if( typeof value === 'string' && key !== 'ELECTRON_RUN_AS_NODE' ) {
			launchEnv[key] = value;
		}
	}
	launchEnv.CHATAIO_E2E = '1';
	launchEnv.CHATAIO_DEMO = '1';
	launchEnv.CHATAIO_E2E_USER_DATA_DIR = options.userDataDir;
	launchEnv.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
	if( options.mode === 'first-launch' ) {
		launchEnv.CHATAIO_E2E_FIRST_LAUNCH = '1';
	}

	const electronApp = await electron.launch( {
		executablePath : paths.electronExecutable ,
		args : [ paths.chatAioRoot ] ,
		cwd : paths.chatAioRoot ,
		env : launchEnv ,
		timeout : 120_000,
	} );

	attachRendererPageErrors( electronApp , [] );
	if( process.env.CHATAIO_E2E_DEBUG === '1' ) {
		collectProcessLogs( electronApp );
	}
	attachDemoCursor( electronApp );

	return {
		electronApp ,
		userDataDir : options.userDataDir ,
		paths,
	};
};

export const closeDemoApp = async( launched:LaunchedDemo , keepOpen:boolean ) => {
	if( keepOpen ) {
		console.log( '[demo] --keep-open: Electron 仍在跑。Ctrl+C 结束。画像：' , launched.userDataDir );
		await new Promise<void>( ( resolve ) => {
			const onSignal = () => {
				process.off( 'SIGINT' , onSignal );
				process.off( 'SIGTERM' , onSignal );
				resolve();
			};
			process.on( 'SIGINT' , onSignal );
			process.on( 'SIGTERM' , onSignal );
		} );
	}
	const pid = launched.electronApp.process()?.pid;
	try {
		await launched.electronApp.evaluate( ( { app } ) => {
			( app as { __chatAIOQuitting? : boolean } ).__chatAIOQuitting = true;
			app.exit( 0 );
		} );
	} catch {
		/* 已退 */
	}
	try {
		await launched.electronApp.close();
	} catch {
		/* ignore */
	}
	if( pid ) {
		try {
			process.kill( pid );
		} catch {
			/* 已退 */
		}
	}
};

/** 主窗或向导窗提到前台并放到舒适录屏尺寸。不要 alwaysOnTop（会挡住 Dropdown / FloatingView）。
 *  已经是目标尺寸就不要再 setSize/center：move 事件会把已打开的 Dropdown 关掉。 */
export const presentDemoWindow = async( electronApp:ElectronApplication ) => {
	try {
		const work = await electronApp.evaluate( ( { screen } ) => {
			return screen.getPrimaryDisplay().workAreaSize;
		} );
		const size = pickDemoWindowSize( work );
		await electronApp.evaluate( ( { BrowserWindow } , next:{
			width : number;
			height : number;
		} ) => {
			const win = BrowserWindow.getAllWindows().find( ( candidate ) => {
				if( candidate.isDestroyed() ) {
					return false;
				}
				if( candidate.getTitle() === 'chataio-demo-cursor-layer' ) {
					return false;
				}
				const url = candidate.webContents.getURL();
				return url.includes( 'MainView' ) || url.includes( 'GuidingView' );
			} );
			if( !win ) {
				return;
			}
			const [ currentWidth , currentHeight ] = win.getSize();
			if( Math.abs( currentWidth - next.width ) > 16 || Math.abs( currentHeight - next.height ) > 16 ) {
				win.setSize( next.width , next.height );
				win.center();
			}
			win.show();
			win.focus();
		} , size );
		await syncDemoCursorLayerBounds();
		await raiseDemoCursorLayer();
	} catch {
		/* 关窗过程忽略 */
	}
};

import { attachDemoCursor , raiseDemoCursorLayer , syncDemoCursorLayerBounds } from './cursor';
import {
	ensureReturningDemoProfile ,
	forceDemoProfileLightTheme ,
	resetDemoProfile,
} from './profile';
import { pickDemoWindowSize } from './window-size';
import { resolveChatAioE2EPaths , type ChatAioE2EPaths } from '../../e2e/support/env';
import { attachRendererPageErrors , collectProcessLogs } from '../../e2e/support/faults';
import { _electron as electron , type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
