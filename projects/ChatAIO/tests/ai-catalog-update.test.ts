/**
 * 批次 5：手动检查目录更新。锁「验签不过不写 pending、revision 不高则不更新、
 * apply 必须对得上这次 check、effective 里已有的种子不当新增、IPC diff 不下发 nextAis、
 * 失败的二次 check 不清上一份成功 pending、写盘前 peek 不消耗 pending」。
 * 不锁 error 文案、不打真实 GitHub。
 * 见 docs/feature-proposal--ai-catalog-source.md 批次 5。
 */

const CHATGPT_ID = '11111111-1111-4111-8111-111111111111';
const GROK_ID = '22222222-2222-4222-8222-222222222222';
const EXTRA_CHATGPT_ID = '44444444-4444-4444-8444-444444444444';

const JSON_URL = 'https://github.com/Kane-Kuroneko/ChatAIO-Releases/releases/download/ai-catalog/default-ais.json';
const SIG_URL = `${ JSON_URL }.sig`;

/** 测例供应商行。 */
const vendor = ( partial:Pick<AICatalog.Vendor , 'id' | 'family'> & Partial<AICatalog.Vendor> ):AICatalog.Vendor => {
	return {
		id : partial.id ,
		family : partial.family ,
		label : partial.label ?? partial.family ,
		url : partial.url ?? 'https://chatgpt.com' ,
		region : partial.region ?? { available : [] , forbidden : [] },
	};
};

/** 测例页实例。 */
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

const catalog = ( ais:AICatalog.Vendor[] , revision:number ):AICatalog.Catalog => {
	return {
		schemaVersion : 1 ,
		revision ,
		ais,
	};
};

const chatgpt = vendor( {
	id : CHATGPT_ID ,
	family : 'chatgpt' ,
	url : 'https://chatgpt.com' ,
	label : 'ChatGPT',
} );
const grok = vendor( {
	id : GROK_ID ,
	family : 'grok' ,
	url : 'https://grok.com' ,
	label : 'Grok',
} );

const bundled = catalog( [ chatgpt ] , 2 );
const keys = generateKeyPairSync( 'ed25519' );
const publicKeyPem = keys.publicKey.export( { type : 'spki' , format : 'pem' } ).toString();

/** 把目录对象签成 JSON 原文 + base64 sig。LF only。 */
const signCatalog = ( body:AICatalog.Catalog | Record<string , unknown> ) => {
	const json = Buffer.from( `${ JSON.stringify( body ) }\n` , 'utf-8' );
	const signature = sign( null , json , keys.privateKey );
	return {
		json ,
		sigText : signature.toString( 'base64' ),
	};
};

const signedFiles = ( body:AICatalog.Catalog | Record<string , unknown> ) => {
	const { json , sigText } = signCatalog( body );
	return {
		[ JSON_URL ] : json ,
		[ SIG_URL ] : Buffer.from( sigText , 'utf-8' ),
	};
};

const fetchFrom = ( files:Record<string , Buffer> ) => {
	return async( url:string ) => {
		const bytes = files[url];
		if( !bytes ) {
			throw new Error( `missing fixture for ${ url }` );
		}
		return bytes;
	};
};

const chatgptPage = ( extra:Partial<AI.AIItem> = {} ) => item( {
	id : CHATGPT_ID ,
	AI_family : 'chatgpt' ,
	url : 'https://chatgpt.com' ,
	label : 'ChatGPT' ,
	...extra ,
} );

type Cycle = ReturnType<typeof createCatalogUpdateCycle>;

const checkFromSigned = (
	cycle:Cycle ,
	body:AICatalog.Catalog | Record<string , unknown> ,
	ours:AI.AIItem[] ,
	deletedIds:string[] = [] ,
	cache:AICatalog.Catalog | null = null ,
	bundledCatalog:AICatalog.Catalog = bundled ,
) => {
	const { json , sigText } = signCatalog( body );
	return cycle.checkFromBytes( {
		bundled : bundledCatalog ,
		cache ,
		ours ,
		deletedIds ,
		publicKeyPem ,
		json ,
		sigText,
	} );
};

describe( '拉 JSON+sig' , () => {
	it( '禁止的下载 URL → forbidden-url' , async() => {
		const result = await fetchSignedCatalogPair(
			'https://evil.example/default-ais.json' ,
			'https://evil.example/default-ais.json.sig' ,
			async() => Buffer.from( 'nope' ),
		);
		assert.equal( result.ok , false );
		if( !result.ok ) {
			assert.equal( result.errorCode , 'forbidden-url' );
		}
	} );

	it( 'fetch 抛错 → network' , async() => {
		const result = await fetchSignedCatalogPair(
			JSON_URL ,
			SIG_URL ,
			async() => {
				throw new Error( 'offline' );
			},
		);
		assert.equal( result.ok , false );
		if( !result.ok ) {
			assert.equal( result.errorCode , 'network' );
		}
	} );

	it( 'JSON 超过体积上限 → invalid-catalog，不是 network' , async() => {
		const result = await fetchSignedCatalogPair(
			JSON_URL ,
			SIG_URL ,
			async( url ) => {
				if( url === SIG_URL ) {
					return Buffer.from( 'c2ln' );
				}
				return Buffer.alloc( CATALOG_MAX_BYTES + 1 );
			},
		);
		assert.equal( result.ok , false );
		if( !result.ok ) {
			assert.equal( result.errorCode , 'invalid-catalog' );
		}
	} );

	it( '白名单 URL 能拿到原文，供后续验签' , async() => {
		const remote = catalog( [ chatgpt , grok ] , 3 );
		const files = signedFiles( remote );
		const result = await fetchSignedCatalogPair( JSON_URL , SIG_URL , fetchFrom( files ) );
		assert.equal( result.ok , true );
		if( result.ok ) {
			assert.equal( result.json.equals( files[JSON_URL] ) , true );
		}
	} );
} );

describe( '手动检查目录更新' , () => {
	it( '更高 revision 且签名正确 → available，pending 记下远程 revision' , () => {
		const cycle = createCatalogUpdateCycle();
		const remote = catalog( [
			{ ...chatgpt , url : 'https://chatgpt.com/' } ,
			grok,
		] , 3 );
		const result = checkFromSigned( cycle , remote , [ chatgptPage() ] );
		assert.equal( result.status , 'available' );
		assert.equal( result.remoteRevision , 3 );
		assert.equal( result.diff?.added.length , 1 );
		assert.equal( result.diff?.added[0].id , GROK_ID );
		assert.equal( cycle.pendingRevision() , 3 );
	} );

	it( 'IPC / public diff 没有 nextAis（写盘计划不下发 renderer）' , () => {
		const cycle = createCatalogUpdateCycle();
		const result = checkFromSigned(
			cycle ,
			catalog( [ chatgpt , grok ] , 3 ) ,
			[ chatgptPage() ],
		);
		assert.equal( result.status , 'available' );
		assert.ok( result.diff );
		assert.equal( 'nextAis' in result.diff , false );
		assert.equal( 'deletedIds' in result.diff , false );
		assert.ok( Array.isArray( result.diff.availability ) );
	} );

	it( 'effective 里已有的官方种子页不出现在 added，即使用户文件还没写上这一行' , () => {
		const bundledWithGrok = catalog( [ chatgpt , grok ] , 2 );
		const userOnlyChatgpt = { ais : [ chatgptPage() ] , deletedIds : [] as string[] };
		const ours = composeEffectiveAIs( bundledWithGrok.ais , userOnlyChatgpt );
		assert.ok( ours.some( ai => ai.id === GROK_ID ) );
		const cycle = createCatalogUpdateCycle();
		const result = checkFromSigned(
			cycle ,
			catalog( [ chatgpt , grok ] , 3 ) ,
			ours ,
			[] ,
			null ,
			bundledWithGrok ,
		);
		assert.equal( result.status , 'available' );
		assert.equal( result.diff?.added.some( ai => ai.id === GROK_ID ) , false );
		assert.equal( result.diff?.added.length , 0 );
	} );

	it( '远程 revision 不超过当前 runtime → up-to-date，不留 pending' , () => {
		const cycle = createCatalogUpdateCycle();
		const result = checkFromSigned( cycle , catalog( [ chatgpt ] , 2 ) , [ chatgptPage() ] );
		assert.equal( result.status , 'up-to-date' );
		assert.equal( cycle.pendingRevision() , null );
	} );

	it( '改 JSON 一个字节 → verify-failed，不留 pending' , () => {
		const cycle = createCatalogUpdateCycle();
		const { json , sigText } = signCatalog( catalog( [ chatgpt , grok ] , 3 ) );
		const tampered = Buffer.from( json );
		tampered[tampered.length - 2] = tampered[tampered.length - 2] ^ 1;
		const result = cycle.checkFromBytes( {
			bundled ,
			cache : null ,
			ours : [] ,
			deletedIds : [] ,
			publicKeyPem ,
			json : tampered ,
			sigText,
		} );
		assert.equal( result.status , 'error' );
		assert.equal( result.errorCode , 'verify-failed' );
		assert.equal( cycle.pendingRevision() , null );
	} );

	it( 'schemaVersion 比 App 高 → schema-too-new' , () => {
		const cycle = createCatalogUpdateCycle();
		const result = checkFromSigned(
			cycle ,
			{
				schemaVersion : 9 ,
				revision : 99 ,
				ais : [ chatgpt ],
			} ,
			[],
		);
		assert.equal( result.status , 'error' );
		assert.equal( result.errorCode , 'schema-too-new' );
		assert.equal( cycle.pendingRevision() , null );
	} );

	it( '已是最新的二次 check 清掉上一份 pending' , () => {
		const cycle = createCatalogUpdateCycle();
		checkFromSigned( cycle , catalog( [ chatgpt , grok ] , 3 ) , [ chatgptPage() ] );
		assert.equal( cycle.pendingRevision() , 3 );
		const second = checkFromSigned( cycle , catalog( [ chatgpt ] , 2 ) , [ chatgptPage() ] );
		assert.equal( second.status , 'up-to-date' );
		assert.equal( cycle.pendingRevision() , null );
	} );

	it( '失败的二次 check 不清上一份成功 pending，原 revision 仍能 previewApply' , () => {
		const cycle = createCatalogUpdateCycle();
		const ours = [ chatgptPage() ];
		checkFromSigned( cycle , catalog( [ chatgpt , grok ] , 3 ) , ours );
		assert.equal( cycle.pendingRevision() , 3 );
		const { json , sigText } = signCatalog( catalog( [ chatgpt , grok ] , 4 ) );
		const tampered = Buffer.from( json );
		tampered[tampered.length - 2] = tampered[tampered.length - 2] ^ 1;
		const second = cycle.checkFromBytes( {
			bundled ,
			cache : null ,
			ours ,
			deletedIds : [] ,
			publicKeyPem ,
			json : tampered ,
			sigText,
		} );
		assert.equal( second.status , 'error' );
		assert.equal( second.errorCode , 'verify-failed' );
		assert.equal( cycle.pendingRevision() , 3 );
		const previewed = cycle.previewApply( {
			bundled ,
			cache : null ,
			ours ,
			deletedIds : [] ,
			expectedRevision : 3,
		} );
		assert.equal( previewed.ok , true );
	} );

	it( '更早的 inflight check 不能盖掉较新的 pending' , () => {
		const cycle = createCatalogUpdateCycle();
		const id1 = cycle.beginCheck();
		const id2 = cycle.beginCheck();
		const { json : json3 , sigText : sig3 } = signCatalog( catalog( [ chatgpt , grok ] , 3 ) );
		const { json : json4 , sigText : sig4 } = signCatalog( catalog( [ chatgpt , grok ] , 4 ) );
		const first = cycle.checkFromBytes( {
			bundled ,
			cache : null ,
			ours : [ chatgptPage() ] ,
			deletedIds : [] ,
			publicKeyPem ,
			json : json3 ,
			sigText : sig3,
		} , id1 );
		assert.equal( first.status , 'error' );
		assert.equal( first.errorCode , 'no-pending' );
		assert.equal( cycle.pendingRevision() , null );
		const second = cycle.checkFromBytes( {
			bundled ,
			cache : null ,
			ours : [ chatgptPage() ] ,
			deletedIds : [] ,
			publicKeyPem ,
			json : json4 ,
			sigText : sig4,
		} , id2 );
		assert.equal( second.status , 'available' );
		assert.equal( cycle.pendingRevision() , 4 );
	} );

	it( '只改 region、页字段没变 → 仍 available（cache 要更新覆盖）' , () => {
		const cycle = createCatalogUpdateCycle();
		const remote = catalog( [ {
			...chatgpt ,
			region : { available : [] , forbidden : [ 'CN' ] },
		} ] , 3 );
		const result = checkFromSigned( cycle , remote , [ chatgptPage() ] );
		assert.equal( result.status , 'available' );
		assert.equal( result.diff?.added.length , 0 );
		assert.equal( result.diff?.updated.length , 0 );
		assert.equal( result.diff?.availability.length , 1 );
		assert.deepEqual( result.diff?.availability[0].forbiddenAdded , [ 'CN' ] );
		assert.equal( result.diff?.availability[0].label , 'ChatGPT' );
		assert.equal( cycle.pendingRevision() , 3 );
	} );

	it( '只抬 revision、供应商行完全一样 → available 且 availability 为空' , () => {
		const cycle = createCatalogUpdateCycle();
		const result = checkFromSigned( cycle , catalog( [ chatgpt ] , 3 ) , [ chatgptPage() ] );
		assert.equal( result.status , 'available' );
		assert.equal( result.diff?.added.length , 0 );
		assert.equal( result.diff?.updated.length , 0 );
		assert.equal( result.diff?.availability.length , 0 );
	} );
} );

describe( '确认合并' , () => {
	it( '没 check 就 apply → no-pending' , () => {
		const cycle = createCatalogUpdateCycle();
		const applied = cycle.previewApply( {
			bundled ,
			cache : null ,
			ours : [] ,
			deletedIds : [] ,
			expectedRevision : 3,
		} );
		assert.equal( applied.ok , false );
		if( !applied.ok ) {
			assert.equal( applied.errorCode , 'no-pending' );
		}
	} );

	it( 'apply 错 revision 不消耗 pending；对的 revision peek 后 commit 才清空' , () => {
		const cycle = createCatalogUpdateCycle();
		const ours = [ chatgptPage() ];
		checkFromSigned( cycle , catalog( [ chatgpt , grok ] , 3 ) , ours );
		const stale = cycle.previewApply( {
			bundled ,
			cache : null ,
			ours ,
			deletedIds : [] ,
			expectedRevision : 2,
		} );
		assert.equal( stale.ok , false );
		assert.equal( cycle.pendingRevision() , 3 );
		const previewed = cycle.previewApply( {
			bundled ,
			cache : null ,
			ours ,
			deletedIds : [] ,
			expectedRevision : 3,
		} );
		assert.equal( previewed.ok , true );
		assert.equal( cycle.pendingRevision() , 3 );
		cycle.commit( 3 );
		assert.equal( cycle.pendingRevision() , null );
	} );

	it( '用户改过的官方 URL 不被覆盖；自加的同 family 页不动；deleted 不复活' , () => {
		const cycle = createCatalogUpdateCycle();
		const ours = [
			chatgptPage( { url : 'https://chatgpt.com/mine' } ) ,
			item( {
				id : EXTRA_CHATGPT_ID ,
				AI_family : 'chatgpt' ,
				url : 'https://chatgpt.com/' ,
				label : 'Work',
			} ),
		];
		const checked = checkFromSigned(
			cycle ,
			catalog( [
				{ ...chatgpt , url : 'https://chatgpt.com/new' } ,
				grok,
			] , 3 ) ,
			ours ,
			[ GROK_ID ],
		);
		assert.ok( checked.diff?.skipped.some( row => row.id === CHATGPT_ID && row.reason === 'user-changed' ) );
		const applied = cycle.previewApply( {
			bundled ,
			cache : null ,
			ours ,
			deletedIds : [ GROK_ID ] ,
			expectedRevision : 3,
		} );
		assert.equal( applied.ok , true );
		if( applied.ok ) {
			assert.equal(
				applied.user.ais.find( ai => ai.id === CHATGPT_ID )?.url ,
				'https://chatgpt.com/mine',
			);
			assert.ok( applied.user.ais.some( ai => ai.id === EXTRA_CHATGPT_ID ) );
			assert.equal( applied.user.ais.some( ai => ai.id === GROK_ID ) , false );
		}
	} );
} );

import assert from 'node:assert/strict';
import { generateKeyPairSync , sign } from 'node:crypto';
import { describe , it } from 'node:test';
import { composeEffectiveAIs } from '#main/services/settings/utils/ai-catalog-merge.utility';
import {
	createCatalogUpdateCycle ,
	fetchSignedCatalogPair,
} from '#main/services/settings/utils/ai-catalog-update.utility';
import { CATALOG_MAX_BYTES } from '#main/services/settings/utils/ai-catalog-validate.utility';
import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
