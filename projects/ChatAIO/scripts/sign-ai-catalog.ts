/**
 * 对瘦供应商目录 default-ais.json 原文签名。
 * 私钥：环境变量 CHATAIO_CATALOG_ED25519_PRIVATE_KEY（PEM 全文），
 * 或 CHATAIO_CATALOG_ED25519_PRIVATE_KEY_FILE（默认 `~/.chataio/ai-catalog-ed25519.key`）。
 * 用法：yarn sign:ai-catalog
 * JSON 必须是 LF（见仓库根 .gitattributes）；签的是工作区原文字节。
 * 见 docs/feature-proposal--ai-catalog-source.md 批次 4。
 */

const catalogDir = path.resolve( __dirname , '..' , 'statics' , 'ai-catalog' );
const jsonPath = path.join( catalogDir , AI_CATALOG_JSON_FILENAME );
const sigPath = path.join( catalogDir , AI_CATALOG_SIG_FILENAME );
const defaultKeyPath = path.join( os.homedir() , '.chataio' , 'ai-catalog-ed25519.key' );

/** 从环境变量或用户目录读 Ed25519 私钥 PEM。仓库里不应有这份文件。 */
const loadPrivateKeyPem = ():string => {
	const fromEnv = process.env.CHATAIO_CATALOG_ED25519_PRIVATE_KEY;
	if( fromEnv && fromEnv.trim() ) {
		return fromEnv.replace( /\\n/g , '\n' );
	}
	const keyFile = process.env.CHATAIO_CATALOG_ED25519_PRIVATE_KEY_FILE || defaultKeyPath;
	if( !fs.existsSync( keyFile ) ) {
		throw new Error( `catalog private key missing: set CHATAIO_CATALOG_ED25519_PRIVATE_KEY or ${ keyFile }` );
	}
	return fs.readFileSync( keyFile , 'utf-8' );
};

const payload = fs.readFileSync( jsonPath );
if( payload.includes( 0x0d ) ) {
	throw new Error( `${ jsonPath } contains CR; catalog JSON must be LF-only so Ed25519 signatures are the same on Windows and Unix` );
}
const parsed = JSON.parse( payload.toString( 'utf-8' ) ) as { ais?: unknown[] };
if( !Array.isArray( parsed.ais ) ) {
	throw new Error( `${ jsonPath } is not a vendor catalog` );
}
for( const row of parsed.ais ) {
	if( row && typeof row === 'object' ) {
		for( const field of [ 'disabled' , 'proxy_mode' , 'preloadOnStartup' , 'url_override' ] ) {
			if( field in row ) {
				throw new Error( `refusing to sign instance field ${ field } in vendor catalog` );
			}
		}
	}
}

const privateKey = createPrivateKey( loadPrivateKeyPem() );
const signature = sign( null , payload , privateKey );
const sigText = `${ signature.toString( 'base64' ) }\n`;
fs.writeFileSync( sigPath , sigText , 'utf-8' );

const publicKeyPem = fs.readFileSync( path.join( catalogDir , 'ed25519.pub' ) , 'utf-8' );
const checked = verifyCatalogSignature( payload , decodeCatalogSignature( sigText ) , publicKeyPem );
if( !checked.ok ) {
	throw new Error( 'signed catalog failed self-verify against ed25519.pub' );
}

console.log( `signed ${ jsonPath } -> ${ sigPath } (${ payload.length } bytes)` );

import {
	AI_CATALOG_JSON_FILENAME ,
	AI_CATALOG_SIG_FILENAME ,
	decodeCatalogSignature ,
	verifyCatalogSignature,
} from '#main/services/settings/ai-catalog-sign.utility';
import {
	createPrivateKey ,
	sign,
} from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
