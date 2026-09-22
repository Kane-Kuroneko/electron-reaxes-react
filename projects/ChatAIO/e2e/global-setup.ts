/**
 * 确认 ChatAIO 生产 webpack 产物存在。缺文件时可选自动构建。
 * 设计：docs/features/e2e-playwright.md
 */

const e2eDir = path.dirname( fileURLToPath( import.meta.url ) );
const repoRoot = path.resolve( e2eDir , '../../..' );
const chatAioRoot = path.resolve( e2eDir , '..' );
const distDir = path.join( chatAioRoot , 'dist' );

const REQUIRED_ARTIFACTS = [
	'main.js' ,
	'preload.js' ,
	'ai-page-preload.js' ,
	path.join( 'renderer' , 'MainView' , 'index.html' ) ,
	path.join( 'renderer' , 'GuidingView' , 'index.html' ) ,
	path.join( 'renderer' , 'DropdownView' , 'index.html' ) ,
	path.join( 'renderer' , 'SettingsView' , 'index.html' ) ,
	path.join( 'renderer' , 'PromptView' , 'index.html' ) ,
	path.join( 'renderer' , 'FloatingView' , 'index.html' ),
];

const missingArtifacts = () => {
	return REQUIRED_ARTIFACTS.filter( ( relativePath ) => {
		return fs.existsSync( path.join( distDir , relativePath ) ) === false;
	} );
};

const runWebpackProductionBuild = () => {
	console.log( '[e2e] webpack production artifacts missing; building ChatAIO…' );
	execSync( 'yarn build:webpack' , {
		cwd : repoRoot ,
		stdio : 'inherit' ,
		env : {
			...process.env,
		},
	} );
};

const devServerDistMessage = () => {
	const htmlPath = path.join( distDir , 'renderer' , 'MainView' , 'index.html' );
	if( fs.existsSync( htmlPath ) === false ) {
		return '';
	}
	const html = fs.readFileSync( htmlPath , 'utf8' );
	const scriptIsSiteRoot = /<script[^>]*\ssrc=["']\//.test( html );
	const statePath = path.join( distDir , '.webpack-build-state.json' );
	let devServer = '';
	if( fs.existsSync( statePath ) ) {
		try {
			const state = JSON.parse( fs.readFileSync( statePath , 'utf8' ) ) as {
				reason? : string;
				devServer? : { origin? : string; port? : number; pid? : number };
			};
			if( state.devServer ) {
				devServer = `${ state.reason || 'webpack-start' } ${ state.devServer.origin || '' } pid=${ state.devServer.pid || '?' }`;
			}
		} catch {
			devServer = 'unreadable .webpack-build-state.json';
		}
	}
	if( scriptIsSiteRoot === false && devServer === '' ) {
		return '';
	}
	return [
		'ChatAIO E2E 用的是 webpack-dev-server 的 dist，不是 yarn build:webpack 的生产文件。' ,
		devServer ? `构建状态：${ devServer }` : 'MainView/index.html 的 script src 以 / 开头。' ,
		'E2E 用 loadFile 打开 file://.../dist/renderer/MainView/index.html。' ,
		'开发产物的脚本是 /MainView/main.js，文件协议下会去盘符根目录找，React 不启动。' ,
		'窗口停在启动底色 #f5f6f8，main-view-menubar 永远不出现，每个用例等到 45s 超时。' ,
		'先停掉本树的 yarn start:webpack，再在仓库根执行 yarn build:webpack，然后重跑 yarn test:e2e。' ,
		'start:webpack 和 build:webpack 共用同一份 dist，开着开发服务器时不要让 E2E 去覆盖它。' ,
	].join( '\n' );
};

export default async function globalSetup() {
	const devDist = devServerDistMessage();
	if( devDist ) {
		throw new Error( devDist );
	}
	let missing = missingArtifacts();
	if( missing.length === 0 ) {
		return;
	}
	if( process.env.CHATAIO_E2E_SKIP_BUILD === '1' ) {
		throw new Error(
			`ChatAIO E2E 缺少 webpack 产物：${ missing.join( ', ' ) }\n`
			+ '请在仓库根执行 yarn build:webpack',
		);
	}
	runWebpackProductionBuild();
	missing = missingArtifacts();
	if( missing.length ) {
		throw new Error(
			`webpack 构建后仍缺少：${ missing.join( ', ' ) }`,
		);
	}
}

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
