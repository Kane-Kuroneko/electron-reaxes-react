/**
 * ChatAIO Playwright E2E 配置。
 * Electron 单实例 + 共享 GPU：默认 workers=1。
 * 不下载 Chromium：测的是仓库内 electron 二进制。
 * 设计：docs/features/e2e-playwright.md
 */

const e2eDir = path.dirname( fileURLToPath( import.meta.url ) );
const repoRoot = path.resolve( e2eDir , '../../..' );

export default defineConfig( {
	testDir : path.join( e2eDir , 'tests' ) ,
	testMatch : /.*\.spec\.ts/ ,
	fullyParallel : false ,
	workers : 1 ,
	timeout : 120_000 ,
	expect : {
		timeout : 20_000,
	} ,
	retries : process.env.CI ? 2 : 0 ,
	forbidOnly : !!process.env.CI ,
	reporter : [
		[ 'list' ] ,
		[ 'html' , {
			open : 'never' ,
			outputFolder : path.join( e2eDir , 'playwright-report' ),
		} ],
	] ,
	outputDir : path.join( e2eDir , 'test-results' ) ,
	globalSetup : path.join( e2eDir , 'global-setup.ts' ) ,
	use : {
		trace : 'retain-on-failure' ,
		screenshot : 'only-on-failure' ,
		/* Windows 上 Electron+ffmpeg 写视频容易卡死测试收尾，默认关掉。见 Dyad e2e。 */
		video : 'off' ,
		actionTimeout : 15_000,
	} ,
	projects : [
		{
			name : 'electron' ,
			metadata : {
				repoRoot,
			},
		},
	],
} );

import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
