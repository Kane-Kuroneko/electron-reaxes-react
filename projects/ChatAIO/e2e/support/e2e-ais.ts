/**
 * 返回用户 E2E 的固定 AI 表：4 页、一条 disabled、URL 走 about:blank。
 * deletedIds 含 bundled 目录全部供应商 + dev-proxy-test，避免 composeEffectiveAIs 把真实站点补回来。
 * 设计：docs/features/e2e-playwright.md 、docs/architecture/ai-config.md
 */

export const E2E_AI_A = {
	id : 'custom-e2e-a' ,
	label : 'E2E Alpha',
} as const;

export const E2E_AI_B = {
	id : 'custom-e2e-b' ,
	label : 'E2E Bravo',
} as const;

export const E2E_AI_C = {
	id : 'custom-e2e-c' ,
	label : 'E2E Charlie',
} as const;

export const E2E_AI_D = {
	id : 'custom-e2e-d' ,
	label : 'E2E Delta',
} as const;

/** 持久化全表：A 开、B 关、C 开、D 开 */
export const E2E_PERSIST_IDS = [
	E2E_AI_A.id ,
	E2E_AI_B.id ,
	E2E_AI_C.id ,
	E2E_AI_D.id,
] as const;

/** Switch AI / Alt 环切只看见 enabled */
export const E2E_ENABLED_IDS = [
	E2E_AI_A.id ,
	E2E_AI_C.id ,
	E2E_AI_D.id,
] as const;

/** unpackaged Electron 会注入这份 dev 页；必须进 deletedIds。见 ai-catalog-builtin.utility.ts */
const DEV_PROXY_TEST_VENDOR_ID = 'f39b0b7e-f419-4a8d-bf92-82ebbe22a7cf';

export type E2EUserAisFile = {
	ais : E2EUserAiItem[];
	deletedIds : string[];
};

export type E2EUserAisPatch = ( file:E2EUserAisFile ) => void;

export const buildE2EUserAisFile = ( catalogVendorIds:string[] ):E2EUserAisFile => {
	return {
		ais : [
			e2eAIItem( E2E_AI_A.id , E2E_AI_A.label , false ) ,
			e2eAIItem( E2E_AI_B.id , E2E_AI_B.label , true ) ,
			e2eAIItem( E2E_AI_C.id , E2E_AI_C.label , false ) ,
			e2eAIItem( E2E_AI_D.id , E2E_AI_D.label , false ),
		] ,
		deletedIds : uniqueIds( [ ...catalogVendorIds , DEV_PROXY_TEST_VENDOR_ID ] ),
	};
};

/** 只给单独用例用：不要改返回用户默认 seed，否则 ai-opened-walk 会假绿。 */
export const patchCharliePreloadOnStartup:E2EUserAisPatch = ( file ) => {
	const charlie = file.ais.find( ( ai ) => ai.id === E2E_AI_C.id );
	if( !charlie ) {
		throw new Error( 'E2E seed missing Charlie' );
	}
	charlie.preloadOnStartup = true;
};

export const isSeededE2EAIId = ( id:string ) => {
	return ( E2E_PERSIST_IDS as readonly string[] ).includes( id );
};

export const readBundledCatalogVendorIds = async( catalogPath:string ) => {
	const raw = await fs.readFile( catalogPath , 'utf8' );
	const catalog = JSON.parse( raw ) as {
		ais? : { id?:string }[];
	};
	return ( catalog.ais || [] )
		.map( ( vendor ) => vendor.id )
		.filter( ( id ):id is string => typeof id === 'string' && id.length > 0 );
};

type E2EUserAiItem = {
	id : string;
	label : string;
	disabled : boolean;
	AI_family : 'custom';
	url : string;
	url_override : null;
	proxy_mode : 'follow_global_setting';
	from_server_list_proxy : null;
	user_fill_proxy : null;
	preloadOnStartup : boolean;
};

const e2eAIItem = ( id:string , label:string , disabled:boolean ):E2EUserAiItem => {
	return {
		id ,
		label ,
		disabled ,
		AI_family : 'custom' as const ,
		url : 'about:blank' ,
		url_override : null ,
		proxy_mode : 'follow_global_setting' as const ,
		from_server_list_proxy : null ,
		user_fill_proxy : null ,
		preloadOnStartup : false,
	};
};

const uniqueIds = ( ids:string[] ) => {
	return [ ...new Set( ids ) ];
};

import fs from 'node:fs/promises';
