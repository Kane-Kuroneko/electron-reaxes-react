/**
 * 供应商目录 → 默认实例。锁用户可见结果（id/url/label/disabled），
 * 不锁内部函数名、不锁假实例号 default-*-001、不锁 Map、不锁 mapping 文件路径。
 * 默认关名单是 App 纯数据（ai-family-disabled-by-default.ts），映射函数只读它。
 * 见 docs/architecture/ai-config.md、docs/feature-proposal--ai-catalog-source.md。
 */

const INSTANCE_FIELDS = [
	'disabled' ,
	'url_override' ,
	'proxy_mode' ,
	'from_server_list_proxy' ,
	'preloadOnStartup' ,
	'user_fill_proxy' ,
];

const DISABLED_BY_DEFAULT_FAMILIES = new Set<AI.AIFamily>( FAMILY_DISABLED_BY_DEFAULT );

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 测例里拼一行供应商。缺省字段不冒充实例。 */
const vendor = ( partial:Pick<AICatalog.Vendor , 'id' | 'family'> & Partial<AICatalog.Vendor> ):AICatalog.Vendor => {
	return {
		id : partial.id ,
		family : partial.family ,
		label : partial.label ?? partial.family ,
		url : partial.url ?? '' ,
		region : partial.region ?? { available : [] , forbidden : [] },
	};
};

/** 测例里拼一页实例，和目录行分开。 */
const item = ( partial:Partial<AI.AIItem> & Pick<AI.AIItem , 'id' | 'AI_family'> ):AI.AIItem => {
	return {
		label : partial.label ?? partial.id ,
		disabled : partial.disabled === true ,
		url : partial.url ?? '' ,
		url_override : partial.url_override ?? null ,
		proxy_mode : partial.proxy_mode || 'follow_global_setting' ,
		from_server_list_proxy : partial.from_server_list_proxy ?? null ,
		user_fill_proxy : partial.user_fill_proxy ?? null ,
		preloadOnStartup : partial.preloadOnStartup === true ,
		...partial ,
	};
};

const bundledCatalogPath = path.join( __dirname , '..' , 'statics' , 'ai-catalog' , 'default-ais.json' );

describe( 'bundled 供应商目录是瘦行，不是 AIItem 种子袋' , () => {
	it( '文件没有 proxy/disabled/preload 等实例字段；每 family 一行；id 是 UUID' , () => {
		const raw = JSON.parse( fs.readFileSync( bundledCatalogPath , 'utf-8' ) );
		assert.equal( raw.schemaVersion , 1 );
		assert.ok( Array.isArray( raw.ais ) );
		assert.ok( raw.ais.length > 0 );
		const families = new Set<string>();
		for( const row of raw.ais ) {
			assert.ok( UUID_RE.test( row.id ) );
			assert.equal( typeof row.family , 'string' );
			assert.equal( typeof row.label , 'string' );
			assert.ok( String( row.url ).startsWith( 'http' ) );
			assert.ok( row.region && Array.isArray( row.region.available ) && Array.isArray( row.region.forbidden ) );
			for( const code of [ ...row.region.available , ...row.region.forbidden ] ) {
				assert.match( code , /^[A-Z]{2}$/ );
			}
			assert.equal( families.has( row.family ) , false );
			families.add( row.family );
			for( const field of INSTANCE_FIELDS ) {
				assert.equal( field in row , false , `${ row.family } 不应有 ${ field }` );
			}
			assert.notEqual( row.family , 'dev-proxy-test' );
		}
	} );
} );

describe( '无 user-ais 时默认列表 = 供应商目录 + App 默认禁用名单' , () => {
	it( 'id/url/label/disabled 与目录行和纯数据名单一致（映射只读名单，不自带定义）' , () => {
		const raw = JSON.parse( fs.readFileSync( bundledCatalogPath , 'utf-8' ) );
		const result = validateCatalog( raw );
		assert.equal( result.ok , true );
		if( !result.ok ) {
			return;
		}
		const effective = composeEffectiveAIs( result.catalog.ais , null );
		assert.equal( effective.length , result.catalog.ais.length );
		for( const vendorRow of result.catalog.ais ) {
			const page = effective.find( ai => ai.id === vendorRow.id );
			assert.ok( page );
			assert.equal( page.url , vendorRow.url );
			assert.equal( page.label , vendorRow.label );
			assert.equal( page.AI_family , vendorRow.family );
			assert.equal( page.disabled , DISABLED_BY_DEFAULT_FAMILIES.has( vendorRow.family ) );
			assert.equal( page.proxy_mode , 'follow_global_setting' );
			assert.equal( page.preloadOnStartup , false );
			assert.equal( page.url_override , null );
		}
		const manus = effective.find( ai => ai.AI_family === 'manus' );
		const chatgpt = effective.find( ai => ai.AI_family === 'chatgpt' );
		assert.equal( manus?.disabled , true );
		assert.equal( chatgpt?.disabled , false );
	} );
} );

describe( '空 url 的 family 项补目录该供应商的官方 url' , () => {
	it( '每 family 一行时按该行 url 补空' , () => {
		const vendors = [
			vendor( { id : '11111111-1111-4111-8111-111111111111' , family : 'chatgpt' , url : 'https://chatgpt.com' } ) ,
			vendor( { id : '22222222-2222-4222-8222-222222222222' , family : 'grok' , url : 'https://grok.com' } ),
		];
		const filled = normalizeAIItem(
			item( { id : 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' , AI_family : 'chatgpt' , url : '' } ) ,
			vendors,
		);
		assert.equal( filled.AI_family , 'chatgpt' );
		assert.equal( filled.url , 'https://chatgpt.com' );
	} );

	it( 'custom 空 url 保持空，不从其它供应商借' , () => {
		const vendors = [
			vendor( { id : '11111111-1111-4111-8111-111111111111' , family : 'chatgpt' , url : 'https://chatgpt.com' } ),
		];
		const filled = normalizeAIItem(
			item( { id : 'custom-1' , AI_family : 'custom' , url : '' } ) ,
			vendors,
		);
		assert.equal( filled.AI_family , 'custom' );
		assert.equal( filled.url , '' );
	} );
} );

describe( '未知 family 的用户实例降 custom' , () => {
	it( '目录里没有的 family 变成 custom，url 保留' , () => {
		const vendors = [
			vendor( { id : '11111111-1111-4111-8111-111111111111' , family : 'chatgpt' , url : 'https://chatgpt.com' } ),
		];
		const filled = normalizeAIItem(
			item( {
				id : 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' ,
				AI_family : 'not-a-real-family' as AI.AIFamily ,
				url : 'https://example.com/chat' ,
			} ) ,
			vendors,
		);
		assert.equal( filled.AI_family , 'custom' );
		assert.equal( filled.url , 'https://example.com/chat' );
	} );
} );

describe( '供应商 region 驱动地区阻断（不是 MakerSuite 门，也不是 domestic 分组）' , () => {
	it( 'bundled ChatGPT 在 CN 阻断；国内供应商空 region 不阻断' , () => {
		const raw = JSON.parse( fs.readFileSync( bundledCatalogPath , 'utf-8' ) );
		const result = validateCatalog( raw );
		assert.equal( result.ok , true );
		if( !result.ok ) {
			return;
		}
		const chatgpt = result.catalog.ais.find( row => row.family === 'chatgpt' );
		const deepseek = result.catalog.ais.find( row => row.family === 'deepseek' );
		assert.ok( chatgpt );
		assert.ok( deepseek );
		assert.equal( isCountryBlockedByVendorRegion( chatgpt.region , 'CN' ) , true );
		assert.equal( isCountryBlockedByVendorRegion( chatgpt.region , 'US' ) , false );
		assert.equal( isCountryBlockedByVendorRegion( deepseek.region , 'CN' ) , false );
		assert.equal( isCountryBlockedByVendorRegion( deepseek.region , 'US' ) , false );
	} );

	it( 'forbidden 优先于 available；available 非空则只放行白名单；都空不限制' , () => {
		assert.equal(
			evaluateVendorRegionAccess(
				{ available : [ 'CN' , 'US' ] , forbidden : [ 'CN' ] } ,
				'CN',
			).reason ,
			'forbidden',
		);
		assert.equal(
			evaluateVendorRegionAccess(
				{ available : [ 'US' ] , forbidden : [] } ,
				'CN',
			).reason ,
			'not-available',
		);
		assert.equal(
			evaluateVendorRegionAccess(
				{ available : [] , forbidden : [] } ,
				'CN',
			).blocked ,
			false,
		);
	} );

	it( '用户加的同 family 第二页按 family 回查目录 region' , () => {
		const vendors = [
			vendor( {
				id : '11111111-1111-4111-8111-111111111111' ,
				family : 'chatgpt' ,
				url : 'https://chatgpt.com' ,
				region : { available : [] , forbidden : [ 'CN' ] },
			} ),
		];
		const extraPage = item( {
			id : 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' ,
			AI_family : 'chatgpt' ,
			url : 'https://chatgpt.com/workspace-2',
		} );
		const region = getVendorRegionForAI( vendors , extraPage );
		assert.equal( isCountryBlockedByVendorRegion( region , 'CN' ) , true );
		assert.equal( findCatalogVendorForAI( vendors , extraPage )?.id , vendors[0].id );
	} );

	it( 'diffVendorAvailability：forbidden 新增进预览；行完全一样则空' , () => {
		const before = vendor( {
			id : '11111111-1111-4111-8111-111111111111' ,
			family : 'chatgpt' ,
			label : 'ChatGPT' ,
			region : { available : [] , forbidden : [] },
		} );
		const after = vendor( {
			id : before.id ,
			family : 'chatgpt' ,
			label : 'ChatGPT' ,
			region : { available : [] , forbidden : [ 'CN' , 'RU' ] },
		} );
		const changed = diffVendorAvailability( [ before ] , [ after ] );
		assert.equal( changed.length , 1 );
		assert.deepEqual( changed[0].forbiddenAdded , [ 'CN' , 'RU' ] );
		assert.equal( changed[0].availableChanged , false );
		assert.equal( diffVendorAvailability( [ after ] , [ after ] ).length , 0 );
	} );
} );

describe( 'dev-proxy-test 只在 dev 注入，不进生产目录文件' , () => {
	it( 'isDev 时追加一行；生产目录映射结果不含该 family' , () => {
		const raw = JSON.parse( fs.readFileSync( bundledCatalogPath , 'utf-8' ) );
		const result = validateCatalog( raw , { production : true } );
		assert.equal( result.ok , true );
		if( !result.ok ) {
			return;
		}
		assert.equal( result.catalog.ais.some( row => row.family === 'dev-proxy-test' ) , false );
		const withDev = appendDevProxyTestVendor( result.catalog , true );
		assert.equal( withDev.ais.some( row => row.family === 'dev-proxy-test' ) , true );
		const withoutDev = appendDevProxyTestVendor( result.catalog , false );
		assert.equal( withoutDev.ais.some( row => row.family === 'dev-proxy-test' ) , false );
	} );
} );

import {
	appendDevProxyTestVendor,
} from '../src/Main/services/settings/utils/ai-catalog-builtin.utility';
import { composeEffectiveAIs } from '../src/Main/services/settings/utils/ai-catalog-merge.utility';
import {
	evaluateVendorRegionAccess ,
	diffVendorAvailability ,
	findCatalogVendorForAI ,
	getVendorRegionForAI ,
	isCountryBlockedByVendorRegion,
} from '../src/Main/services/settings/utils/ai-catalog-region.utility';
import { validateCatalog } from '../src/Main/services/settings/utils/ai-catalog-validate.utility';
import { normalizeAIItem } from '../src/Main/services/settings/utils/normalize-ai-item.utility';
import type { AICatalog } from '../src/Types/AICatalog';
import type { AI } from '../src/Types/SettingsTypes/AI';
import { FAMILY_DISABLED_BY_DEFAULT } from '#shared/statics/ai-family-disabled-by-default';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe , it } from 'node:test';
