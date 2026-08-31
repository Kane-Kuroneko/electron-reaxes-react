/**
 * 供应商目录校验 + 三路 merge。锁用户可见结果（effective id/url、是否采纳），
 * 不锁 error 文案、不锁假实例号 default-*-001、不锁 Map。
 * 见 docs/feature-proposal--ai-catalog-source.md（方向纠偏后的批次 3）。
 */

const CHATGPT_ID = '11111111-1111-4111-8111-111111111111';
const GROK_ID = '22222222-2222-4222-8222-222222222222';
const CLAUDE_ID = '33333333-3333-4333-8333-333333333333';
const EXTRA_CHATGPT_ID = '44444444-4444-4444-8444-444444444444';

/** 测例供应商行。缺省字段不冒充实例。 */
const vendor = ( partial:Pick<AICatalog.Vendor , 'id' | 'family'> & Partial<AICatalog.Vendor> ):AICatalog.Vendor => {
	return {
		id : partial.id ,
		family : partial.family ,
		label : partial.label ?? partial.family ,
		url : partial.url ?? '' ,
		region : partial.region ?? { available : [] , forbidden : [] },
	};
};

/** 测例页实例，和目录行分开。 */
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

/** 测例目录信封。 */
const catalog = ( ais:AICatalog.Vendor[] , revision = 1 ):AICatalog.Catalog => {
	return {
		schemaVersion : 1 ,
		revision ,
		ais,
	};
};

/** 断言用：id 序列 / 某页 url / 目录行 family。 */
const idsOf = ( ais:Array<{ id:string }> ) => ais.map( ai => ai.id ).join( ',' );
const urlOf = ( ais:AI.AIItem[] , id:string ) => ais.find( ai => ai.id === id )?.url;
const familyOfVendors = ( ais:AICatalog.Vendor[] , id:string ) => ais.find( ai => ai.id === id )?.family;

const chatgpt = vendor( { id : CHATGPT_ID , family : 'chatgpt' , url : 'https://chatgpt.com' , label : 'ChatGPT' } );
const grok = vendor( { id : GROK_ID , family : 'grok' , url : 'https://grok.com' , label : 'Grok' } );
const claude = vendor( { id : CLAUDE_ID , family : 'claude' , url : 'https://claude.ai' , label : 'Claude' } );

/** 官方种子页（id = 供应商 UUID）。extra 用来模拟用户改过的字段。 */
const chatgptPage = ( extra:Partial<AI.AIItem> = {} ) => item( {
	id : CHATGPT_ID ,
	AI_family : 'chatgpt' ,
	url : 'https://chatgpt.com' ,
	label : 'ChatGPT' ,
	...extra ,
} );
/** 同上，Grok 种子页。 */
const grokPage = ( extra:Partial<AI.AIItem> = {} ) => item( {
	id : GROK_ID ,
	AI_family : 'grok' ,
	url : 'https://grok.com' ,
	label : 'Grok' ,
	...extra ,
} );

describe( '无 cache / 无 user 时 effective 来自供应商映射' , () => {
	it( '没有 user-ais 时列表就是目录供应商顺序与官方 url' , () => {
		const effective = composeEffectiveAIs( [ chatgpt , grok , claude ] , null );
		assert.equal( idsOf( effective ) , `${ CHATGPT_ID },${ GROK_ID },${ CLAUDE_ID }` );
		assert.equal( urlOf( effective , CHATGPT_ID ) , 'https://chatgpt.com' );
	} );

	it( 'user 整表在前，目录里 user 没有且未删除的种子页追加在后' , () => {
		const user = {
			ais : [
				grokPage( { url : 'https://grok.com/custom' } ) ,
				chatgptPage(),
			] ,
			deletedIds : [] as string[],
		};
		const effective = composeEffectiveAIs( [ chatgpt , grok , claude ] , user );
		assert.equal( idsOf( effective ) , `${ GROK_ID },${ CHATGPT_ID },${ CLAUDE_ID }` );
		assert.equal( urlOf( effective , GROK_ID ) , 'https://grok.com/custom' );
	} );

	it( 'deletedIds 里的种子页不会复活' , () => {
		const user = {
			ais : [ chatgptPage() ] ,
			deletedIds : [ GROK_ID ],
		};
		const effective = composeEffectiveAIs( [ chatgpt , grok , claude ] , user );
		assert.equal( idsOf( effective ) , `${ CHATGPT_ID },${ CLAUDE_ID }` );
	} );

	it( 'cache revision 不低于 bundled 时用 cache 当目录' , () => {
		const bundled = catalog( [ chatgpt ] , 1 );
		const cache = catalog( [ grok ] , 2 );
		const runtime = selectRuntimeCatalog( bundled , cache );
		assert.equal( idsOf( runtime.ais ) , GROK_ID );
	} );

	it( '没有 cache 文件时 runtime 目录就是 bundled' , () => {
		const bundled = catalog( [ chatgpt , grok ] , 1 );
		const runtime = selectRuntimeCatalog( bundled , null );
		assert.equal( idsOf( runtime.ais ) , `${ CHATGPT_ID },${ GROK_ID }` );
	} );
} );

describe( '三路 merge：目录改官方 url；用户改过的不覆盖；用户加页不误伤' , () => {
	it( 'theirs 新增供应商且不在 deletedIds 则出现在结果末尾' , () => {
		const next = applyCatalogMerge( [ chatgpt ] , [ chatgpt , grok ] , [ chatgptPage() ] , [] );
		assert.equal( idsOf( next.ais ) , `${ CHATGPT_ID },${ GROK_ID }` );
	} );

	it( '用户改过种子页 url 则仍用用户的，不跟目录走' , () => {
		const theirs = [
			vendor( { ...chatgpt , url : 'https://chatgpt.com/new' } ) ,
			grok,
		];
		const ours = [
			chatgptPage( { url : 'https://chatgpt.com/mine' } ) ,
			grokPage(),
		];
		const next = applyCatalogMerge( [ chatgpt , grok ] , theirs , ours , [] );
		assert.equal( urlOf( next.ais , CHATGPT_ID ) , 'https://chatgpt.com/mine' );
		assert.equal( urlOf( next.ais , GROK_ID ) , 'https://grok.com' );
	} );

	it( 'deletedIds 阻止目录把该种子页加回来' , () => {
		const next = applyCatalogMerge( [ chatgpt , grok ] , [ chatgpt , grok ] , [ chatgptPage() ] , [ GROK_ID ] );
		assert.equal( idsOf( next.ais ) , CHATGPT_ID );
	} );

	it( '目录删了某供应商，用户表里仍在的不会被删掉' , () => {
		const preview = previewCatalogMerge( [ chatgpt , grok ] , [ chatgpt ] , [ chatgptPage() , grokPage() ] , [] );
		assert.equal( idsOf( preview.nextAis ) , `${ CHATGPT_ID },${ GROK_ID }` );
		assert.ok( preview.catalogDropped.some( row => row.id === GROK_ID ) );
	} );

	it( 'ours 没改过的官方 url 可以跟 theirs' , () => {
		const theirs = [ vendor( { ...chatgpt , url : 'https://chatgpt.com/v2' } ) ];
		const next = applyCatalogMerge( [ chatgpt ] , theirs , [ chatgptPage() ] , [] );
		assert.equal( urlOf( next.ais , CHATGPT_ID ) , 'https://chatgpt.com/v2' );
	} );

	it( '用户加的同 family 新 id 不被目录 merge 误伤' , () => {
		const extra = item( {
			id : EXTRA_CHATGPT_ID ,
			AI_family : 'chatgpt' ,
			url : 'https://chatgpt.com/workspace-2' ,
			label : 'ChatGPT 2' ,
		} );
		const theirs = [ vendor( { ...chatgpt , url : 'https://chatgpt.com/v2' } ) ];
		const ours = [ chatgptPage() , extra ];
		const next = applyCatalogMerge( [ chatgpt ] , theirs , ours , [] );
		assert.equal( urlOf( next.ais , CHATGPT_ID ) , 'https://chatgpt.com/v2' );
		assert.equal( urlOf( next.ais , EXTRA_CHATGPT_ID ) , 'https://chatgpt.com/workspace-2' );
		assert.equal( next.ais.find( ai => ai.id === EXTRA_CHATGPT_ID )?.label , 'ChatGPT 2' );
	} );
} );

describe( '校验：供应商目录 UUID / family / host' , () => {
	it( '未知 family 整份拒绝（远程不能发明新 family）' , () => {
		const result = validateCatalog( catalog( [
			chatgpt ,
			vendor( {
				id : '55555555-5555-4555-8555-555555555555' ,
				family : 'not-a-real-family' as AI.AIFamily ,
				url : 'https://example.com/chat' ,
			} ),
		] ) );
		assert.equal( result.ok , false );
	} );

	it( 'host 不在白名单则 family 降 custom，不丢行' , () => {
		const result = validateCatalog( catalog( [
			vendor( { id : CHATGPT_ID , family : 'chatgpt' , url : 'https://evil.example/chat' } ),
		] ) );
		assert.equal( result.ok , true );
		if( !result.ok ) {
			return;
		}
		assert.equal( familyOfVendors( result.catalog.ais , CHATGPT_ID ) , 'custom' );
		assert.equal( result.catalog.ais.find( row => row.id === CHATGPT_ID )?.url , 'https://evil.example/chat' );
	} );

	it( 'schemaVersion 更高则整份拒绝' , () => {
		const result = validateCatalog( {
			schemaVersion : 2 ,
			revision : 1 ,
			ais : [ chatgpt ],
		} );
		assert.equal( result.ok , false );
	} );

	it( 'id 不是 UUID 则整份拒绝' , () => {
		const result = validateCatalog( catalog( [
			vendor( { id : 'default-chatgpt-001' , family : 'chatgpt' , url : 'https://chatgpt.com' } ),
		] ) );
		assert.equal( result.ok , false );
	} );

	it( '生产构建丢掉误入的 dev-proxy-test，其它行仍在' , () => {
		const result = validateCatalog( catalog( [
			chatgpt ,
			vendor( {
				id : '66666666-6666-4666-8666-666666666666' ,
				family : 'dev-proxy-test' ,
				url : 'https://whatismyipaddress.com/' ,
			} ),
		] ) , { production : true } );
		assert.equal( result.ok , true );
		if( !result.ok ) {
			return;
		}
		assert.equal( idsOf( result.catalog.ais ) , CHATGPT_ID );
	} );
} );

describe( '校验：重复 family / 重复 id 整份非法' , () => {
	it( '同一 family 两行则整份 catalog 非法' , () => {
		const result = validateCatalog( catalog( [
			vendor( { id : CHATGPT_ID , family : 'chatgpt' , url : 'https://chatgpt.com' } ) ,
			vendor( { id : EXTRA_CHATGPT_ID , family : 'chatgpt' , url : 'https://chatgpt.com/backend-api' } ),
		] ) );
		assert.equal( result.ok , false );
	} );

	it( '重复 id 则整份 catalog 非法' , () => {
		const result = validateCatalog( catalog( [
			vendor( { id : CHATGPT_ID , family : 'chatgpt' , url : 'https://chatgpt.com' } ) ,
			vendor( { id : CHATGPT_ID , family : 'grok' , url : 'https://grok.com' } ),
		] ) );
		assert.equal( result.ok , false );
	} );
	it( 'region 非法 ISO 或拼成 forbiden 则整份拒绝' , () => {
		assert.equal( validateCatalog( catalog( [
			vendor( {
				id : CHATGPT_ID ,
				family : 'chatgpt' ,
				url : 'https://chatgpt.com' ,
				region : { available : [] , forbidden : [ 'USA' ] },
			} ),
		] ) ).ok , false );
		assert.equal( validateCatalog( {
			schemaVersion : 1 ,
			revision : 1 ,
			ais : [ {
				id : CHATGPT_ID ,
				family : 'chatgpt' ,
				label : 'ChatGPT' ,
				url : 'https://chatgpt.com' ,
				region : { forbiden : [ 'CN' ] },
			} ],
		} ).ok , false );
	} );
} );

import {
	composeEffectiveAIs ,
	previewCatalogMerge ,
	applyCatalogMerge ,
	selectRuntimeCatalog,
} from '../src/Main/services/settings/utils/ai-catalog-merge.utility';
import { validateCatalog } from '../src/Main/services/settings/utils/ai-catalog-validate.utility';
import type { AICatalog } from '../src/Types/AICatalog';
import type { AI } from '../src/Types/SettingsTypes/AI';
import assert from 'node:assert/strict';
import { describe , it } from 'node:test';
