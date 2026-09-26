/**
 * 演示持久画像：六家真站点、全开 preload、浅色英文、全局 Direct。
 * 登录态留在 demo/.profile 的 partition 里，脚本不登账号。
 * 已有画像也按出镜表 upsert（保留同一 id，避免把 cookie 对不上）。
 * 设计：docs/features/playwright-demo-script.md
 */

export const demoProfileDir = () => {
	return path.resolve( path.dirname( fileURLToPath( import.meta.url ) ) , '..' , '.profile' );
};

export const bundledCatalogPath = ( chatAioRoot:string ) => {
	return path.join( chatAioRoot , 'statics' , 'ai-catalog' , 'default-ais.json' );
};

export const profileHasReturningUser = async( userDataDir:string ) => {
	try {
		await fs.access( path.join( userDataDir , 'user-settings.json' ) );
		return true;
	} catch {
		return false;
	}
};

export const resetDemoProfile = async( userDataDir:string ) => {
	await fs.rm( userDataDir , {
		recursive : true ,
		force : true,
	} );
};

export const seedReturningDemoProfile = async( userDataDir:string , chatAioRoot:string ) => {
	await ensureReturningDemoProfile( userDataDir , chatAioRoot );
};

/**
 * 每次返回用户启动都对齐出镜表。不清 session 分区；只改 user-ais / 外观 / last-used。
 */
export const ensureReturningDemoProfile = async( userDataDir:string , chatAioRoot:string ) => {
	await fs.mkdir( userDataDir , { recursive : true } );
	const vendors = await readBundledVendors( bundledCatalogPath( chatAioRoot ) );
	const showcase = showcaseVendors( vendors );
	const chatgpt = vendorByFamily( vendors , 'chatgpt' );
	const existing = await readExistingUserAis( userDataDir );
	const byId = new Map( existing.ais.map( ( item ) => [ item.id , item ] ) );
	const showcaseIds = new Set( showcase.map( ( vendor ) => vendor.id ) );

	const showcaseItems = showcase.map( ( vendor ) => {
		return toDemoAiItem( vendor , byId.get( vendor.id ) , {
			disabled : false ,
			preloadOnStartup : true,
		} );
	} );
	const restCatalog = vendors
		.filter( ( vendor ) => {
			return showcaseIds.has( vendor.id ) === false
				&& vendor.id !== DEV_PROXY_TEST_VENDOR_ID;
		} )
		.map( ( vendor ) => {
			return toDemoAiItem( vendor , byId.get( vendor.id ) , {
				disabled : true ,
				preloadOnStartup : false,
			} );
		} );
	const extras = existing.ais
		.filter( ( item ) => {
			return vendors.some( ( vendor ) => vendor.id === item.id ) === false
				&& item.id !== DEV_PROXY_TEST_VENDOR_ID;
		} )
		.map( ( item ) => {
			return {
				...item ,
				disabled : true ,
				preloadOnStartup : false ,
				proxy_mode : item.proxy_mode || 'follow_global_setting',
			};
		} );

	const deletedIds = uniqueIds( [
		...existing.deletedIds ,
		DEV_PROXY_TEST_VENDOR_ID,
	] ).filter( ( id ) => showcaseIds.has( id ) === false );

	await fs.writeFile(
		path.join( userDataDir , 'user-ais.json' ) ,
		`${ JSON.stringify( {
			ais : [ ...showcaseItems , ...restCatalog , ...extras ] ,
			deletedIds,
		} , null , '\t' ) }\n` ,
		'utf8',
	);
	await writeDemoUserSettings( userDataDir );
	await fs.writeFile(
		path.join( userDataDir , 'previously-used-ai.json' ) ,
		`${ JSON.stringify( {
			previously_used_ai : chatgpt.id,
		} , null , '\t' ) }\n` ,
		'utf8',
	);
};

/**
 * 已有画像也钉回浅色英文。Guiding 备带 / 中途挂掉都不能带着深色或中文进画面。
 */
export const forceDemoProfileLightTheme = async( userDataDir:string ) => {
	await writeDemoUserSettings( userDataDir , {
		createIfMissing : false,
	} );
};

const writeDemoUserSettings = async(
	userDataDir:string ,
	options:{ createIfMissing?:boolean } = {},
) => {
	const settingsPath = path.join( userDataDir , 'user-settings.json' );
	let parsed : Record<string , unknown> = {};
	try {
		parsed = JSON.parse( await fs.readFile( settingsPath , 'utf8' ) ) as Record<string , unknown>;
	} catch {
		if( options.createIfMissing === false ) {
			return;
		}
	}
	const settings = isPlainObject( parsed.settings ) ? parsed.settings : {};
	const networks = isPlainObject( settings.networks ) ? settings.networks : {};
	const globalProxy = isPlainObject( networks.global_proxy ) ? networks.global_proxy : {};
	const userFill = isPlainObject( globalProxy.user_fill_proxy ) ? globalProxy.user_fill_proxy : {};
	const system = isPlainObject( settings.system ) ? settings.system : {};
	const startup = isPlainObject( settings.startup ) ? settings.startup : {};
	const appearance = isPlainObject( settings.appearance ) ? settings.appearance : {};
	const next = {
		...parsed ,
		version : typeof parsed.version === 'string' ? parsed.version : '1.0.0' ,
		settings : {
			...settings ,
			networks : {
				...networks ,
				global_proxy : {
					...globalProxy ,
					proxy_mode : 'direct' ,
					proxy_server_id : globalProxy.proxy_server_id ?? null ,
					user_fill_proxy : {
						protocol : userFill.protocol || 'http' ,
						hostname : userFill.hostname || '127.0.0.1' ,
						port : typeof userFill.port === 'number' ? userFill.port : 7890 ,
						proxy_auth : userFill.proxy_auth === true ,
						no_proxy_for : Array.isArray( userFill.no_proxy_for ) ? userFill.no_proxy_for : [] ,
						no_proxy_for__enabled : userFill.no_proxy_for__enabled !== false,
					},
				} ,
				proxy_server_list : Array.isArray( networks.proxy_server_list )
					? networks.proxy_server_list
					: [] ,
				proxy_test_urls : isPlainObject( networks.proxy_test_urls )
					? networks.proxy_test_urls
					: {
						foreign : 'https://api.ipify.org?format=json' ,
						domestic : 'https://myip.ipip.net',
					},
			} ,
			system : {
				...system ,
				gpu_acceleration : system.gpu_acceleration !== false ,
				show_tray : false ,
				close_to_tray : false,
			} ,
			startup : {
				...startup ,
				aiPageLoadMode : 'last-used-ai',
			} ,
			appearance : {
				...appearance ,
				darkmode : false ,
				theme : 'light' ,
				language : 'en-US',
			},
		},
	};
	await fs.writeFile( settingsPath , `${ JSON.stringify( next , null , '\t' ) }\n` , 'utf8' );
};

type DemoAiRecord = {
	id : string;
	label : string;
	AI_family : string;
	url : string;
	disabled : boolean;
	url_override : string | null;
	proxy_mode : string;
	from_server_list_proxy : string | null;
	user_fill_proxy : unknown;
	preloadOnStartup : boolean;
	[key : string] : unknown;
};

const readExistingUserAis = async( userDataDir:string ) => {
	try {
		const parsed = JSON.parse(
			await fs.readFile( path.join( userDataDir , 'user-ais.json' ) , 'utf8' ),
		) as {
			ais? : DemoAiRecord[];
			deletedIds? : string[];
		};
		return {
			ais : Array.isArray( parsed.ais ) ? parsed.ais.filter( ( item ) => typeof item?.id === 'string' ) : [] ,
			deletedIds : Array.isArray( parsed.deletedIds )
				? parsed.deletedIds.filter( ( id ) => typeof id === 'string' )
				: [],
		};
	} catch {
		return {
			ais : [] as DemoAiRecord[] ,
			deletedIds : [] as string[],
		};
	}
};

const toDemoAiItem = (
	vendor:DemoVendor ,
	previous:DemoAiRecord | undefined ,
	flags:{ disabled:boolean; preloadOnStartup:boolean },
):DemoAiRecord => {
	return {
		...previous ,
		id : vendor.id ,
		label : vendor.label ,
		AI_family : vendor.family ,
		url : vendor.url ,
		disabled : flags.disabled ,
		url_override : previous?.url_override ?? null ,
		proxy_mode : 'follow_global_setting' ,
		from_server_list_proxy : previous?.from_server_list_proxy ?? null ,
		user_fill_proxy : previous?.user_fill_proxy ?? null ,
		preloadOnStartup : flags.preloadOnStartup,
	};
};

const uniqueIds = ( ids:string[] ) => {
	return [ ...new Set( ids ) ];
};

const isPlainObject = ( value:unknown ):value is Record<string , any> => {
	return value !== null && typeof value === 'object' && Array.isArray( value ) === false;
};

import {
	DEV_PROXY_TEST_VENDOR_ID ,
	readBundledVendors ,
	showcaseVendors ,
	vendorByFamily ,
	type DemoVendor,
} from './catalog';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
