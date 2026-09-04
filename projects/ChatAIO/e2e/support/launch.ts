export type LaunchMode = 'returning-user' | 'first-launch';

export type LaunchedChatAio = {
	electronApp : ElectronApplication;
	userDataDir : string;
	paths : ChatAioE2EPaths;
	logs : ElectronProcessLogs;
	rendererFaults : string[];
};

export const launchChatAio = async( options:{
	mode : LaunchMode;
	patchUserAis? : E2EUserAisPatch;
} ):Promise<LaunchedChatAio> => {
	const paths = resolveChatAioE2EPaths();
	if( fs.existsSync( paths.electronExecutable ) === false ) {
		throw new Error( `Electron binary missing: ${ paths.electronExecutable }` );
	}
	const userDataDir = await fs.promises.mkdtemp(
		path.join( os.tmpdir() , 'chataio-e2e-' ),
	);
	if( options.mode === 'returning-user' ) {
		await seedReturningUserProfile( userDataDir , options.patchUserAis );
	}

	const launchEnv : Record<string , string> = {};
	for( const [ key , value ] of Object.entries( process.env ) ) {
		if( typeof value === 'string' && key !== 'ELECTRON_RUN_AS_NODE' ) {
			launchEnv[key] = value;
		}
	}
	launchEnv.CHATAIO_E2E = '1';
	launchEnv.CHATAIO_E2E_USER_DATA_DIR = userDataDir;
	launchEnv.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
	if( options.mode === 'first-launch' ) {
		launchEnv.CHATAIO_E2E_FIRST_LAUNCH = '1';
	}

	/* 1.62 的 electron.launch 没有 browser.launch 那种 slowMo；观测走 CHATAIO_E2E_WATCH。 */
	const electronApp = await electron.launch( {
		executablePath : paths.electronExecutable ,
		args : [ paths.chatAioRoot ] ,
		cwd : paths.chatAioRoot ,
		env : launchEnv ,
		timeout : 120_000,
	} );

	const logs = collectProcessLogs( electronApp );
	const rendererFaults : string[] = [];
	attachRendererPageErrors( electronApp , rendererFaults );

	return {
		electronApp ,
		userDataDir ,
		paths ,
		logs ,
		rendererFaults,
	};
};

export const closeChatAio = async( launched:LaunchedChatAio ) => {
	const holdMs = e2eHoldMs();
	if( holdMs > 0 ) {
		/* 让人看清最后一帧再关窗。见 docs/features/e2e-playwright.md 「观测 Settings 执行」 */
		await sleep( holdMs );
	}
	const pid = launched.electronApp.process()?.pid;
	try {
		await launched.electronApp.evaluate( ( { app } ) => {
			( app as { __chatAIOQuitting? : boolean } ).__chatAIOQuitting = true;
			app.exit( 0 );
		} );
	} catch {
		/* 进程可能已退出 */
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
			/* 已退出 */
		}
	}
	await sleep( 400 );
	const persistedFaults = await readPersistedE2EFaults( launched.userDataDir );
	await fs.promises.rm( launched.userDataDir , {
		recursive : true ,
		force : true,
	} ).catch( () => {} );
	return persistedFaults;
};

import { _electron as electron , type ElectronApplication } from '@playwright/test';
import { resolveChatAioE2EPaths , type ChatAioE2EPaths } from './env';
import { attachRendererPageErrors , collectProcessLogs , readPersistedE2EFaults , type ElectronProcessLogs } from './faults';
import { seedReturningUserProfile } from './seed-profile';
import type { E2EUserAisPatch } from './e2e-ais';
import { sleep } from './app-probe';
import { e2eHoldMs } from './observe';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
