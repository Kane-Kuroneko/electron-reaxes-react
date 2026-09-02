/**
 * AI 配置服务：bundled/cache 供应商目录 + 用户实例整表。
 * 目录不是默认 AI 列表；getDefaultAIs() 返回「供应商行 + 内置策略」映射后的默认实例。
 * 校验 / merge / 映射都是命令式纯函数，不用 obsReaction。
 * 见 docs/feature-proposal--ai-catalog-source.md（方向纠偏后的三层）。
 */

const USER_AI_CONFIG_FILE = 'user-ais.json';
const CATALOG_CACHE_FILE = 'catalog-ais.json';

/** 读 bundled 瘦目录并校验。缺文件或非法直接抛，启动不能静默空列表。 */
const loadBundledCatalog = ( production:boolean ):AICatalog.Catalog => {
	const catalogPath = resolveBundledCatalogPath();
	if( !fs.existsSync( catalogPath ) ) {
		const message = `[AIConfigService] bundled catalog missing: ${ catalogPath }`;
		console.error( message );
		throw new Error( message );
	}
	let parsed:unknown;
	try {
		parsed = JSON.parse( fs.readFileSync( catalogPath , 'utf-8' ) );
	} catch ( error ) {
		console.error( `[AIConfigService] failed to parse bundled catalog: ${ catalogPath }` , error );
		throw error;
	}
	const result = validateCatalog( parsed , { production } );
	if( !result.ok ) {
		const message = `[AIConfigService] bundled catalog failed validation: ${ catalogPath }`;
		console.error( message );
		throw new Error( message );
	}
	return result.catalog;
};

class AIConfigService {
	private userConfigPath:string;
	private catalogCachePath:string;
	private bundledCatalog:AICatalog.Catalog;
	/** 用户确认过的 cache；没有或非法为 null。 */
	private catalogCache:AICatalog.Catalog | null;
	/** cache 若 revision ≥ bundled 且通过校验则用它，否则 bundled。无 cache 文件 = 只用 bundled。 */
	private runtimeCatalog:AICatalog.Catalog;
	/** Settings 检查更新的 pending。失败的 check 不清；写盘成功才 commit。 */
	private catalogUpdateCycle = createCatalogUpdateCycle();
	
	/** 启动时读 bundled，再按 revision 选 cache，dev 下追加探测页。不拉网。 */
	constructor() {
		const production = !dev();
		this.userConfigPath = path.join( app.getPath( 'userData' ) , USER_AI_CONFIG_FILE );
		this.catalogCachePath = path.join( app.getPath( 'userData' ) , CATALOG_CACHE_FILE );
		this.bundledCatalog = loadBundledCatalog( production );
		this.catalogCache = this.readCatalogCache( production );
		this.runtimeCatalog = appendDevProxyTestVendor(
			selectRuntimeCatalog( this.bundledCatalog , this.catalogCache ) ,
			dev(),
		);
	}

	/** 安装包内那份瘦目录。检查更新时当 bundledRevision。 */
	getBundledCatalog():AICatalog.Catalog {
		return this.bundledCatalog;
	}

	/** 用户确认过的 cache；没有文件则为 null。 */
	getCachedCatalog():AICatalog.Catalog | null {
		return this.catalogCache;
	}

	/**
	 * 把用户确认过的远程目录写入 cache，并按 revision 重选 runtime。
	 * 先写 user 表再写 cache：user 成功、cache 失败时页已经在整表里，不会丢确认结果。
	 * 只在 Settings 确认合并之后调用。见 docs/features/ai-catalog-manual-update.md。
	 */
	adoptRemoteCatalog( catalog:AICatalog.Catalog , user:AICatalog.UserAIs ):void {
		this.saveUserConfig( user );
		this.writeCatalogCache( catalog );
		this.runtimeCatalog = appendDevProxyTestVendor(
			selectRuntimeCatalog( this.bundledCatalog , this.catalogCache ) ,
			dev(),
		);
	}

	/**
	 * 验签远程字节并算出 diff。ours 用 effective 列表（含已 compose 的种子页）。
	 * 失败不清上一份 pending。checkId 在 fetch 前 begin，避免慢的旧请求盖掉新结果。
	 */
	private beginCatalogCheck():number {
		return this.catalogUpdateCycle.beginCheck();
	}

	private checkSignedCatalog(
		json:Buffer ,
		sigText:string ,
		publicKeyPem:string ,
		checkId?:number ,
	):AICatalog.CatalogUpdateCheckResult {
		const user = this.getUserConfig();
		return this.catalogUpdateCycle.checkFromBytes( {
			bundled : this.bundledCatalog ,
			cache : this.catalogCache ,
			ours : this.getEffectiveAIs() ,
			deletedIds : user?.deletedIds ?? [] ,
			publicKeyPem ,
			json ,
			sigText,
		} , checkId );
	}

	/**
	 * 按这次 check 的 revision 合并。写盘成功才清 pending。
	 */
	private applySignedCatalog( revision:number ):AICatalog.CatalogUpdateApplyResult {
		const user = this.getUserConfig();
		const previewed = this.catalogUpdateCycle.previewApply( {
			bundled : this.bundledCatalog ,
			cache : this.catalogCache ,
			ours : this.getEffectiveAIs() ,
			deletedIds : user?.deletedIds ?? [] ,
			expectedRevision : revision,
		} );
		if( previewed.ok === false ) { /* 必须 === false，见 CODING_STANDARD.md 判别联合 */
			return {
				success : false ,
				errorCode : previewed.errorCode,
			};
		}
		this.adoptRemoteCatalog( previewed.catalog , previewed.user );
		this.catalogUpdateCycle.commit( revision );
		return { success : true };
	}

	/**
	 * 仅供 `ai-catalog-update-runtime` 调用。禁止 IPC / 其它 reaxel 直调。
	 * 生产入口只有 `checkAiCatalogUpdate` / `applyAiCatalogUpdate`（经队列）。
	 * 见 docs/features/ai-catalog-manual-update.md
	 */
	forRuntimeBeginCatalogCheck():number {
		return this.beginCatalogCheck();
	}

	/** 仅供 catalog update runtime。禁止 IPC / 其它 reaxel 直调。 */
	forRuntimeCheckSignedCatalog(
		json:Buffer ,
		sigText:string ,
		publicKeyPem:string ,
		checkId?:number ,
	):AICatalog.CatalogUpdateCheckResult {
		return this.checkSignedCatalog( json , sigText , publicKeyPem , checkId );
	}

	/** 仅供 catalog update runtime。禁止 IPC / 其它 reaxel 直调。 */
	forRuntimeApplySignedCatalog( revision:number ):AICatalog.CatalogUpdateApplyResult {
		return this.applySignedCatalog( revision );
	}

	/** 仅供 catalog update runtime。用户取消预览时丢掉 pending。 */
	forRuntimeDiscardCatalogUpdate():void {
		this.catalogUpdateCycle.discard();
	}

	/** 把已验签目录写成 userData/catalog-ais.json。启动不再验签这份，只 validate。 */
	private writeCatalogCache( catalog:AICatalog.Catalog ):void {
		const dir = path.dirname( this.catalogCachePath );
		if( !fs.existsSync( dir ) ) {
			fs.mkdirSync( dir , { recursive : true } );
		}
		fs.writeFileSync(
			this.catalogCachePath ,
			JSON.stringify( {
				schemaVersion : catalog.schemaVersion ,
				revision : catalog.revision ,
				description : catalog.description ,
				ais : catalog.ais,
			} , null , 2 ) + '\n' ,
			'utf-8',
		);
		this.catalogCache = catalog;
	}

	/** 读 userData 里用户确认过的已验签目录。坏文件当没有，回落到 bundled。 */
	private readCatalogCache( production:boolean ):AICatalog.Catalog | null {
		try {
			if( !fs.existsSync( this.catalogCachePath ) ) {
				return null;
			}
			const parsed = JSON.parse( fs.readFileSync( this.catalogCachePath , 'utf-8' ) );
			const result = validateCatalog( parsed , { production } );
			if( !result.ok ) {
				console.warn( '[AIConfigService] catalog cache failed validation, using bundled' );
				return null;
			}
			return result.catalog;
		} catch ( error ) {
			console.warn( '[AIConfigService] catalog cache unreadable, using bundled' , error );
			return null;
		}
	}

	/** 用当前 runtime 目录给实例补空 url / 未知 family。 */
	private normalizeAI( ai:AI.AIItem ):AI.AIItem {
		return normalizeAIItem( ai , this.runtimeCatalog.ais );
	}
	
	/**
	 * 默认实例（由供应商目录 + 内置策略映射），不是目录原样。
	 * IPC `get-default-ais` 仍返回 AI.AIItem[]，Settings/Guiding 吃的是页实例。
	 */
	getDefaultAIs():AI.AIItem[] {
		return cloneObservableToPlain(
			this.runtimeCatalog.ais.map( vendor => vendorToAIItem( vendor ) ),
		);
	}
	
	/** 读用户整表 + deletedIds；没有文件或读失败返回 null。 */
	getUserConfig():AICatalog.UserAIs | null {
		try {
			if( !fs.existsSync( this.userConfigPath ) ) {
				return null;
			}
			const content = fs.readFileSync( this.userConfigPath , 'utf-8' );
			const userConfig = JSON.parse( content ) as AICatalog.UserAIs;
			return {
				ais : Array.isArray( userConfig.ais ) ? userConfig.ais.map( ai => this.normalizeAI( ai ) ) : [] ,
				deletedIds : Array.isArray( userConfig.deletedIds ) ? userConfig.deletedIds : [],
			};
		} catch ( error ) {
			console.error( '[AIConfigService] Failed to read user config:' , error );
			return null;
		}
	}
	
	/** 用户表里的页实例；没有 user 文件则 null（调用方应走默认映射）。 */
	getUserAIs():AI.AIItem[] | null {
		return this.getUserConfig()?.ais ?? null;
	}
	
	/** 把用户整表写盘。不是 delta。 */
	saveUserConfig( userConfig:AICatalog.UserAIs ):void {
		try {
			const dir = path.dirname( this.userConfigPath );
			if( !fs.existsSync( dir ) ) {
				fs.mkdirSync( dir , { recursive : true } );
			}
			fs.writeFileSync(
				this.userConfigPath ,
				JSON.stringify( {
					ais : userConfig.ais.map( ai => this.normalizeAI( ai ) ) ,
					deletedIds : userConfig.deletedIds || [],
				} , null , 2 ) ,
				'utf-8',
			);
		} catch ( error ) {
			console.error( '[AIConfigService] Failed to save user config:' , error );
			throw error;
		}
	}
	
	/** 只换 ais 数组；deletedIds 未传则沿用当前文件里的。 */
	saveUserAIs( ais:AI.AIItem[] , deletedIds?:string[] ):void {
		const currentConfig = this.getUserConfig();
		this.saveUserConfig( {
			ais ,
			deletedIds : deletedIds ?? currentConfig?.deletedIds ?? [],
		} );
	}
	
	/** Settings 保存整表入口。目录种子页有、新表没有的 id 记进 deletedIds，避免下次又被补回来。 */
	replaceAllAIs( ais:AI.AIItem[] ):void {
		const nextIds = new Set( ais.map( ai => ai.id ) );
		const deletedIds = this.getDefaultAIs()
			.filter( ai => !nextIds.has( ai.id ) )
			.map( ai => ai.id );
		this.saveUserAIs( ais , deletedIds );
	}
	
	/** 当前该给 UI 的页列表：用户表 + 尚未删除的官方种子页。 */
	getEffectiveAIs():AI.AIItem[] {
		return composeEffectiveAIs( this.runtimeCatalog.ais , this.getUserConfig() )
			.map( ai => this.normalizeAI( ai ) );
	}
	
	/** 删掉 user-ais.json，下次读回目录映射的默认实例。 */
	resetToDefaults():void {
		try {
			if( fs.existsSync( this.userConfigPath ) ) {
				fs.unlinkSync( this.userConfigPath );
			}
		} catch ( error ) {
			console.error( '[AIConfigService] Failed to reset user config:' , error );
			throw error;
		}
	}
	
	/** 是否已有 user 整表文件（有文件 ≠ 一定改过字段）。 */
	hasUserModifications():boolean {
		return fs.existsSync( this.userConfigPath );
	}
	
	/** 按实例 id 查有效列表里的那一页。 */
	getAIById( id:string ):AI.AIItem | undefined {
		return this.getEffectiveAIs().find( ai => ai.id === id );
	}

	/**
	 * 运行时按实例 id（种子页）或 family（用户加的同供应商第二页）回查目录行。
	 * region 不拷进 AIItem，避免 IPC 形状变掉。
	 */
	getCatalogVendorForAI( ai:Pick<AI.AIItem , 'id' | 'AI_family'> ):AICatalog.Vendor | null {
		return findCatalogVendorForAI( this.runtimeCatalog.ais , ai );
	}

	/** 该页对应供应商的 region；查不到则不限制。 */
	getVendorRegionForAI( ai:Pick<AI.AIItem , 'id' | 'AI_family'> ):AICatalog.VendorRegion {
		return getVendorRegionForAI( this.runtimeCatalog.ais , ai );
	}

	/** 出口国家码是否应按该页对应的供应商 region 显示本地阻断页。 */
	isAICountryBlockedByCatalog( ai:Pick<AI.AIItem , 'id' | 'AI_family'> , countryCode:string ):boolean {
		return isCountryBlockedByVendorRegion( this.getVendorRegionForAI( ai ) , countryCode );
	}
	
	/** 改一页实例字段并整表写盘。找不到 id 返回 null。 */
	updateAI( id:string , updates:Partial<AI.AIItem> ):AI.AIItem | null {
		const effectiveAIs = this.getEffectiveAIs();
		const index = effectiveAIs.findIndex( ai => ai.id === id );
		
		if( index === -1 ) {
			console.warn( '[AIConfigService] AI not found:' , id );
			return null;
		}
		
		effectiveAIs[index] = this.normalizeAI( {
			...effectiveAIs[index] ,
			...updates ,
			id,
		} );
		
		this.replaceAllAIs( effectiveAIs );
		return effectiveAIs[index];
	}
	
	/** 用户加一页（新实例 id）。同 family 第二页不会占用供应商 UUID。 */
	addAI( ai:Omit<AI.AIItem , 'id'> & { id?: string } ):AI.AIItem {
		const effectiveAIs = this.getEffectiveAIs();
		const newAI = this.normalizeAI( {
			...ai ,
			id : ai.id || this.generateUniqueId(),
		} as AI.AIItem );
		
		effectiveAIs.push( newAI );
		this.replaceAllAIs( effectiveAIs );
		
		return newAI;
	}
	
	/** 从有效列表去掉一页并写盘；官方种子页会进 deletedIds。 */
	deleteAI( id:string ):boolean {
		const effectiveAIs = this.getEffectiveAIs();
		const filteredAIs = effectiveAIs.filter( ai => ai.id !== id );
		
		if( filteredAIs.length === effectiveAIs.length ) {
			console.warn( '[AIConfigService] AI not found for deletion:' , id );
			return false;
		}
		
		this.replaceAllAIs( filteredAIs );
		return true;
	}

	/** Switch AI / Manage AIs 拖拽排序后立即持久化。契约见 ai-list-reorder.md。 */
	reorderEnabledAIs( orderedIds:string[] ):{ success:boolean; changed:boolean; error?:string } {
		/* orderedIds 要么是全表置换，要么是 enabled 槽位合并，见 resolveReorderedAIs。 */
		const current = this.getEffectiveAIs();
		const merged = resolveReorderedAIs( current , orderedIds );
		if( !merged ) {
			return {
				success : false ,
				changed : false ,
				error : 'Enabled AI id list does not match current settings',
			};
		}
		if( enabledAIIdsEqual( current.map( ai => ai.id ) , merged.map( ai => ai.id ) ) ) {
			return {
				success : true ,
				changed : false,
			};
		}
		this.replaceAllAIs( merged );
		return {
			success : true ,
			changed : true,
		};
	}
	
	/** 用户新加页的实例 id，不是供应商 UUID。 */
	private generateUniqueId():string {
		return `ai-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 , 11 ) }`;
	}
	
	/**
	 * 返回需要启动预加载的 AI 实例 ID 列表（替代旧版 family 粒度 API）。
	 * Family 粒度无法区分同 family 多实例，详情见 fixme.md P2-03。
	 */
	getPreloadAIIds():string[] {
		return this.getEffectiveAIs()
			.filter( ai => !ai.disabled && ai.preloadOnStartup )
			.map( ai => ai.id );
	}

	/** @deprecated 使用 getPreloadAIIds() 替代，原因见 fixme.md P2-03 */
	getPreloadAIFamilies():AI.AIFamily[] {
		const preloadFamilies = new Set<AI.AIFamily>();

		this.getEffectiveAIs().forEach( ai => {
			if( !ai.disabled && ai.preloadOnStartup ) {
				preloadFamilies.add( ai.AI_family );
			}
		} );

		return Array.from( preloadFamilies );
	}
}

let instance:AIConfigService | null = null;

/** 进程内单例。main 启动后各 IPC / View 都走这一份。 */
export function getAIConfigService():AIConfigService {
	if( !instance ) {
		instance = new AIConfigService();
	}
	return instance;
}

export default AIConfigService;

import { resolveBundledCatalogPath } from './utils/ai-catalog-path.utility';
import {
	appendDevProxyTestVendor ,
	vendorToAIItem,
} from './utils/ai-catalog-builtin.utility';
import {
	findCatalogVendorForAI ,
	getVendorRegionForAI ,
	isCountryBlockedByVendorRegion,
} from './utils/ai-catalog-region.utility';
import {
	composeEffectiveAIs ,
	selectRuntimeCatalog,
} from './utils/ai-catalog-merge.utility';
import { createCatalogUpdateCycle } from './utils/ai-catalog-update.utility';
import { validateCatalog } from './utils/ai-catalog-validate.utility';
import { normalizeAIItem } from './utils/normalize-ai-item.utility';
import { cloneObservableToPlain } from '#shared/utils/clone-for-ipc.utility';
import {
	enabledAIIdsEqual ,
	resolveReorderedAIs,
} from '#shared/utils/merge-enabled-ai-order.utility';
import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import { dev } from 'electron-is';
