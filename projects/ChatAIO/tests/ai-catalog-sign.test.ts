/**
 * 供应商目录验签：锁「原文对上才过、改一个字节/缺 sig 不过」。
 * 不锁 error 文案、不把生产私钥当 fixture。
 * 见 docs/feature-proposal--ai-catalog-source.md 批次 4。
 */

const INSTANCE_FIELDS = [
	'disabled' ,
	'url_override' ,
	'proxy_mode' ,
	'from_server_list_proxy' ,
	'preloadOnStartup' ,
	'user_fill_proxy' ,
];

const bundledCatalogPath = path.join( __dirname , '..' , 'statics' , 'ai-catalog' , 'default-ais.json' );

/** 测例用临时 Ed25519 钥对，不碰生产私钥。 */
const makeKeys = () => {
	return generateKeyPairSync( 'ed25519' );
};

/** 把公钥导出成 PEM，喂给 verifyCatalogSignature。 */
const pemPublic = ( key:KeyObject ) => {
	return key.export( { type : 'spki' , format : 'pem' } ).toString();
};

describe( '瘦目录原文验签' , () => {
	it( 'bundled JSON 是 LF 原文，不含 CR（Windows autocrlf 不能改签过的字节）' , () => {
		const payload = fs.readFileSync( bundledCatalogPath );
		assert.equal( payload.includes( 0x0d ) , false );
	} );

	it( 'bundled JSON 没有实例字段；用测试密钥签过则通过' , () => {
		const payload = fs.readFileSync( bundledCatalogPath );
		const raw = JSON.parse( payload.toString( 'utf-8' ) );
		assert.ok( Array.isArray( raw.ais ) );
		for( const row of raw.ais ) {
			for( const field of INSTANCE_FIELDS ) {
				assert.equal( field in row , false );
			}
		}
		const { publicKey , privateKey } = makeKeys();
		const signature = sign( null , payload , privateKey );
		assert.equal( verifyCatalogSignature( payload , signature , pemPublic( publicKey ) ).ok , true );
	} );

	it( '仓库内 bundled .sig 对得上 JSON 和 ed25519.pub' , () => {
		const payload = fs.readFileSync( bundledCatalogPath );
		const sigText = fs.readFileSync( path.join( __dirname , '..' , 'statics' , 'ai-catalog' , 'default-ais.json.sig' ) , 'utf-8' );
		const publicKeyPem = fs.readFileSync( path.join( __dirname , '..' , 'statics' , 'ai-catalog' , 'ed25519.pub' ) , 'utf-8' );
		assert.equal(
			verifyCatalogSignature( payload , decodeCatalogSignature( sigText ) , publicKeyPem ).ok ,
			true,
		);
	} );

	it( '改 JSON 一个字节则失败' , () => {
		const payload = Buffer.from( '{"schemaVersion":1,"revision":1,"ais":[]}\n' , 'utf-8' );
		const { publicKey , privateKey } = makeKeys();
		const signature = sign( null , payload , privateKey );
		const tampered = Buffer.from( payload );
		tampered[tampered.length - 2] = tampered[tampered.length - 2] ^ 1;
		assert.equal( verifyCatalogSignature( tampered , signature , pemPublic( publicKey ) ).ok , false );
	} );

	it( '缺 sig 或空 sig 失败' , () => {
		const payload = Buffer.from( '{"schemaVersion":1,"revision":1,"ais":[]}' , 'utf-8' );
		const { publicKey } = makeKeys();
		assert.equal( verifyCatalogSignature( payload , null , pemPublic( publicKey ) ).ok , false );
		assert.equal( verifyCatalogSignature( payload , Buffer.alloc( 0 ) , pemPublic( publicKey ) ).ok , false );
	} );

	it( 'base64 .sig 解码必须是 64 字节' , () => {
		const good = sign( null , Buffer.from( 'x' ) , makeKeys().privateKey );
		assert.equal( decodeCatalogSignature( `${ good.toString( 'base64' ) }\n` )?.length , 64 );
		assert.equal( decodeCatalogSignature( '' ) , null );
		assert.equal( decodeCatalogSignature( 'not-base64-sig' ) , null );
	} );
} );

describe( '远程目录 URL 白名单' , () => {
	it( '只放行该 owner/repo 的 github download 和 githubusercontent' , () => {
		assert.equal( isAllowedAiCatalogDownloadUrl( AI_CATALOG_REMOTE_JSON_URL ) , true );
		assert.equal( isAllowedAiCatalogDownloadUrl( AI_CATALOG_REMOTE_SIG_URL ) , true );
		assert.equal(
			isAllowedAiCatalogDownloadUrl( 'https://objects.githubusercontent.com/github-production-release-asset-2e65be/foo' ) ,
			true,
		);
		assert.equal(
			isAllowedAiCatalogDownloadUrl( 'https://github.com/evil/repo/releases/download/ai-catalog/default-ais.json' ) ,
			false,
		);
		assert.equal( isAllowedAiCatalogDownloadUrl( 'http://github.com/Kane-Kuroneko/ChatAIO-Releases/releases/download/ai-catalog/default-ais.json' ) , false );
		assert.equal( isAllowedAiCatalogDownloadUrl( 'https://example.com/default-ais.json' ) , false );
	} );
} );

import {
	AI_CATALOG_REMOTE_JSON_URL ,
	AI_CATALOG_REMOTE_SIG_URL ,
	decodeCatalogSignature ,
	isAllowedAiCatalogDownloadUrl ,
	verifyCatalogSignature,
} from '#main/services/settings/ai-catalog-sign.utility';
import {
	generateKeyPairSync ,
	sign ,
	type KeyObject,
} from 'node:crypto';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe , it } from 'node:test';
