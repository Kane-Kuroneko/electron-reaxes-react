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

export default async function globalSetup() {
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
