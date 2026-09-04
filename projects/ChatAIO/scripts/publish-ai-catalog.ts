/**
 * 把已签名的瘦目录推到 ChatAIO-Releases tag `ai-catalog`。
 * 先跑 sign-ai-catalog.ts。需要 gh 已登录且对该仓有写权限。
 * 用法：见 projects/ChatAIO/scripts.md「供应商目录签名 / 发布」
 * 见 docs/feature-proposal--ai-catalog-source.md 批次 4。
 *
 * 必须 `--latest=false`：electron-updater 读的是仓库 Latest 上的 latest.yml，
 * 目录 Release 若抢走 Latest，About / 启动检查会 404。
 */

const catalogDir = path.resolve( __dirname , '..' , 'statics' , 'ai-catalog' );
const jsonPath = path.join( catalogDir , AI_CATALOG_JSON_FILENAME );
const sigPath = path.join( catalogDir , AI_CATALOG_SIG_FILENAME );
const pubPath = path.join( catalogDir , 'ed25519.pub' );
const repo = `${ AI_CATALOG_RELEASE_OWNER }/${ AI_CATALOG_RELEASE_REPO }`;

if( !fs.existsSync( jsonPath ) || !fs.existsSync( sigPath ) ) {
	throw new Error( 'sign the catalog first (missing default-ais.json or .sig)' );
}

const payload = fs.readFileSync( jsonPath );
const sigText = fs.readFileSync( sigPath , 'utf-8' );
const publicKeyPem = fs.readFileSync( pubPath , 'utf-8' );
const checked = verifyCatalogSignature( payload , decodeCatalogSignature( sigText ) , publicKeyPem );
if( !checked.ok ) {
	throw new Error( 'local catalog signature does not match ed25519.pub; refuse to upload' );
}

const ensureRelease = spawnSync(
	'gh' ,
	[ 'release' , 'view' , AI_CATALOG_RELEASE_TAG , '--repo' , repo ] ,
	{ encoding : 'utf-8' },
);
if( ensureRelease.status !== 0 ) {
	const created = spawnSync(
		'gh' ,
		[
			'release' , 'create' , AI_CATALOG_RELEASE_TAG ,
			'--repo' , repo ,
			'--title' , 'AI vendor catalog' ,
			'--notes' , 'Signed slim vendor catalog (id/family/label/url/region). Not an app update.' ,
			'--latest=false' ,
		] ,
		{ encoding : 'utf-8' , stdio : 'inherit' },
	);
	if( created.status !== 0 ) {
		throw new Error( `gh release create failed for ${ repo } ${ AI_CATALOG_RELEASE_TAG }` );
	}
}

const uploaded = spawnSync(
	'gh' ,
	[
		'release' , 'upload' , AI_CATALOG_RELEASE_TAG ,
		jsonPath ,
		sigPath ,
		'--repo' , repo ,
		'--clobber' ,
	] ,
	{ encoding : 'utf-8' , stdio : 'inherit' },
);
if( uploaded.status !== 0 ) {
	throw new Error( `gh release upload failed for ${ repo } ${ AI_CATALOG_RELEASE_TAG }` );
}

/* 目录 tag 绝不能当 GitHub Latest，否则 electron-updater 会去拉 ai-catalog/latest.yml。 */
const demoteLatest = spawnSync(
	'gh' ,
	[ 'release' , 'edit' , AI_CATALOG_RELEASE_TAG , '--repo' , repo , '--latest=false' ] ,
	{ encoding : 'utf-8' , stdio : 'inherit' },
);
if( demoteLatest.status !== 0 ) {
	throw new Error( `gh release edit --latest=false failed for ${ repo } ${ AI_CATALOG_RELEASE_TAG }` );
}

console.log( `uploaded ${ AI_CATALOG_JSON_FILENAME } + ${ AI_CATALOG_SIG_FILENAME } to ${ repo }@${ AI_CATALOG_RELEASE_TAG }` );
console.log( AI_CATALOG_REMOTE_JSON_URL );
console.log( AI_CATALOG_REMOTE_SIG_URL );

import {
	AI_CATALOG_JSON_FILENAME ,
	AI_CATALOG_RELEASE_OWNER ,
	AI_CATALOG_RELEASE_REPO ,
	AI_CATALOG_RELEASE_TAG ,
	AI_CATALOG_REMOTE_JSON_URL ,
	AI_CATALOG_REMOTE_SIG_URL ,
	AI_CATALOG_SIG_FILENAME ,
	decodeCatalogSignature ,
	verifyCatalogSignature,
} from '#main/services/settings/utils/ai-catalog-sign.utility';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
