/**
 * 供应商 logo 辨识重构的纯函数契约：
 * - toVendorRef：内置 family 只带 family；custom 才带 favicon / url
 * - vendorFallbackText：首字母取字来源
 * - buildDefaultAIName：默认名不带厂商前缀，池子耗尽退「显示名 + 序号」
 * 见 docs/features/ai-vendor-logo-identity.md
 */

const ai = ( over:Partial<AI.AIItem> = {} ):AI.AIItem => ( {
	id : 'x' ,
	label : 'X' ,
	disabled : false ,
	AI_family : 'chatgpt' as AI.AIFamily ,
	url : 'https://chatgpt.com' ,
	url_override : null ,
	desc : '' ,
	preloadOnStartup : false ,
	proxy_mode : 'follow_global_setting' ,
	from_server_list_proxy : null ,
	user_fill_proxy : null ,
	...over,
} );

describe( 'toVendorRef' , () => {
	it( '内置 family 只带 family，即便传了 favicon 也忽略' , () => {
		const ref = toVendorRef( ai() , 'data:image/png;base64,AAA' );
		assert.deepEqual( ref , { family : 'chatgpt' } );
	} );

	it( 'custom 带 faviconUrl 与 url（override 优先）' , () => {
		const ref = toVendorRef(
			ai( { AI_family : 'custom' as AI.AIFamily , url : 'https://a.example' , url_override : 'https://b.example' } ) ,
			'data:image/png;base64,AAA',
		);
		assert.deepEqual( ref , {
			family : 'custom' ,
			faviconUrl : 'data:image/png;base64,AAA' ,
			url : 'https://b.example',
		} );
	} );

	it( 'custom 无 favicon 时 faviconUrl 为 null' , () => {
		const ref = toVendorRef( ai( { AI_family : 'custom' as AI.AIFamily , url : 'https://a.example' } ) );
		assert.equal( ref.faviconUrl , null );
		assert.equal( ref.url , 'https://a.example' );
	} );

	it( '所有打包 logo 的 family 都在集合里' , () => {
		assert.equal( AI_FAMILIES_WITH_BUNDLED_LOGO.size , 19 );
		for( const family of [ 'chatgpt' , 'claude' , 'gemini' , 'grok' , 'deepseek' , 'kimi' ] ) {
			assert.equal( hasBundledVendorLogo( family ) , true , family );
		}
		assert.equal( hasBundledVendorLogo( 'custom' ) , false );
		assert.equal( hasBundledVendorLogo( 'dev-proxy-test' ) , false );
	} );
} );

describe( 'vendorFallbackText' , () => {
	it( '优先站点域名' , () => {
		assert.equal( vendorFallbackText( { family : 'custom' , url : 'https://www.foo.example/path' } , 'Jack' ) , 'www.foo.example' );
	} );

	it( '无 url 用 label，再退 family' , () => {
		assert.equal( vendorFallbackText( { family : 'custom' } , 'Jack' ) , 'Jack' );
		assert.equal( vendorFallbackText( { family : 'custom' } ) , 'custom' );
	} );

	it( '非法 url 原样返回' , () => {
		assert.equal( vendorFallbackText( { family : 'custom' , url : 'not a url' } ) , 'not a url' );
	} );
} );

describe( 'buildDefaultAIName' , () => {
	it( '默认名不带厂商前缀，取池子第一个未占用名' , () => {
		assert.equal( buildDefaultAIName( 'chatgpt' as AI.AIFamily , [] ) , AI_NAME_POOL[0] );
	} );

	it( '兼容老数据 ChatGPT-Anselm：视为 Anselm 已占用' , () => {
		const name = buildDefaultAIName( 'claude' as AI.AIFamily , [ ai( { id : 'a' , label : 'ChatGPT-Anselm' } ) ] );
		assert.equal( name , AI_NAME_POOL[1] );
	} );

	it( '编辑态排除自身' , () => {
		const name = buildDefaultAIName( 'claude' as AI.AIFamily , [ ai( { id : 'me' , label : 'Anselm' } ) ] , 'me' );
		assert.equal( name , AI_NAME_POOL[0] );
	} );

	it( '大小写不敏感去重' , () => {
		const name = buildDefaultAIName( 'claude' as AI.AIFamily , [ ai( { id : 'a' , label : 'anselm' } ) ] );
		assert.equal( name , AI_NAME_POOL[1] );
	} );

	it( '池子耗尽退「显示名 序号」，并跳过已占用序号' , () => {
		const existing = AI_NAME_POOL.map( ( label , index ) => ai( { id : String( index ) , label } ) );
		existing.push( ai( { id : 'n2' , label : 'ChatGPT 2' } ) );
		assert.equal( buildDefaultAIName( 'chatgpt' as AI.AIFamily , existing ) , 'ChatGPT 3' );
	} );
} );

import {
	AI_FAMILIES_WITH_BUNDLED_LOGO ,
	hasBundledVendorLogo ,
	toVendorRef ,
	vendorFallbackText,
} from '#shared/ai-vendor-logo/vendor-logo.utility';
import { AI_NAME_POOL , buildDefaultAIName } from '#shared/utils/default-ai-name.utility';
import type { AI } from '#src/Types/SettingsTypes/AI';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
