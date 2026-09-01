/**
 * 供应商目录手动更新：验签 → 校验 → preview。不进 renderer，不写盘，不藏全局 pending。
 * pending 由 createCatalogUpdateCycle 持有，AIConfigService 用同一份协议。
 * 远程字节由调用方注入。见 docs/features/ai-catalog-manual-update.md。
 */

export const CATALOG_UPDATE_FETCH_TIMEOUT_MS = 20_000;

type IngestOk = {
	ok: true;
	catalog: AICatalog.Catalog;
};

type IngestFail = {
	ok: false;
	errorCode: Extract<AICatalog.CatalogUpdateErrorCode , 'verify-failed' | 'invalid-catalog' | 'schema-too-new'>;
};

type FetchPairOk = {
	ok: true;
	json: Buffer;
	sigText: string;
};

type FetchPairFail = {
	ok: false;
	errorCode: Extract<AICatalog.CatalogUpdateErrorCode , 'network' | 'forbidden-url' | 'invalid-catalog'>;
};

type EvaluatedUpdate = Pick<AICatalog.CatalogUpdateCheckResult , 'status' | 'bundledRevision' | 'cacheRevision' | 'remoteRevision'> & {
	diff?: AICatalog.MergePreview;
	remote?: AICatalog.Catalog;
	runtime?: AICatalog.Catalog;
	errorCode?: AICatalog.CatalogUpdateErrorCode;
};

/**
 * 把远程 JSON 原文 + sidecar 签收成可 merge 的目录。
 * 先验签再 parse；schema 比 App 高则 schema-too-new。
 */
export const ingestSignedCatalog = (
	jsonBytes:Buffer ,
	sigText:string ,
	publicKeyPem:string ,
	options:AICatalog.ValidateOptions = {},
):IngestOk | IngestFail => {
	if( !jsonBytes || jsonBytes.length === 0 || jsonBytes.length > CATALOG_MAX_BYTES ) {
		return { ok : false , errorCode : 'invalid-catalog' };
	}
	const signature = decodeCatalogSignature( sigText );
	if( !verifyCatalogSignature( jsonBytes , signature , publicKeyPem ).ok ) {
		return { ok : false , errorCode : 'verify-failed' };
	}
	let parsed:unknown;
	try {
		parsed = JSON.parse( jsonBytes.toString( 'utf-8' ) );
	} catch {
		return { ok : false , errorCode : 'invalid-catalog' };
	}
	const schemaVersion = peekCatalogSchemaVersion( parsed );
	if( schemaVersion !== null && schemaVersion > KNOWN_CATALOG_SCHEMA_VERSION ) {
		return { ok : false , errorCode : 'schema-too-new' };
	}
	const validated = validateCatalog( parsed , options );
	if( !validated.ok ) {
		return { ok : false , errorCode : 'invalid-catalog' };
	}
	return { ok : true , catalog : validated.catalog };
};

/**
 * 只拉 JSON + sig 原文。URL 必须过 host 白名单。
 * fetchBytes 由 main 注入（net.fetch）或测试注入（内存 fixture）。
 */
export const fetchSignedCatalogPair = async(
	jsonUrl:string ,
	sigUrl:string ,
	fetchBytes:( url:string ) => Promise<Buffer>,
):Promise<FetchPairOk | FetchPairFail> => {
	if( !isAllowedAiCatalogDownloadUrl( jsonUrl ) || !isAllowedAiCatalogDownloadUrl( sigUrl ) ) {
		return { ok : false , errorCode : 'forbidden-url' };
	}
	try {
		const [ json , sig ] = await Promise.all( [
			fetchBytes( jsonUrl ) ,
			fetchBytes( sigUrl ),
		] );
		if( !json || json.length === 0 ) {
			return { ok : false , errorCode : 'network' };
		}
		if( json.length > CATALOG_MAX_BYTES ) {
			return { ok : false , errorCode : 'invalid-catalog' };
		}
		return {
			ok : true ,
			json ,
			sigText : sig.toString( 'utf-8' ),
		};
	} catch {
		return { ok : false , errorCode : 'network' };
	}
};

/** Modal / IPC 要页 diff + 地区变化，不把 nextAis 写盘计划送给 renderer。 */
export const toPublicCatalogDiff = (
	preview:AICatalog.MergePreview ,
	baseVendors:AICatalog.Vendor[] ,
	theirsVendors:AICatalog.Vendor[],
):AICatalog.CatalogUpdateDiff => {
	return {
		added : preview.added ,
		updated : preview.updated ,
		skipped : preview.skipped ,
		catalogDropped : preview.catalogDropped ,
		availability : diffVendorAvailability( baseVendors , theirsVendors ),
	};
};

export const toIpcCatalogCheckResult = (
	evaluated:EvaluatedUpdate ,
):AICatalog.CatalogUpdateCheckResult => {
	const publicDiff = evaluated.diff && evaluated.runtime && evaluated.remote
		? toPublicCatalogDiff( evaluated.diff , evaluated.runtime.ais , evaluated.remote.ais )
		: undefined;
	return {
		status : evaluated.status ,
		bundledRevision : evaluated.bundledRevision ,
		cacheRevision : evaluated.cacheRevision ,
		remoteRevision : evaluated.remoteRevision ,
		errorCode : evaluated.errorCode ,
		diff : publicDiff,
	};
};

/**
 * 对比 runtime 目录 revision 与远程，必要时算 merge preview。
 * remote.revision ≤ 当前 runtime → 已是最新。
 */
export const evaluateCatalogUpdate = (
	bundled:AICatalog.Catalog ,
	cache:AICatalog.Catalog | null ,
	ours:AI.AIItem[] ,
	deletedIds:string[] ,
	remote:AICatalog.Catalog ,
):EvaluatedUpdate => {
	const runtime = selectRuntimeCatalog( bundled , cache );
	const bundledRevision = bundled.revision;
	const cacheRevision = cache ? cache.revision : null;
	if( remote.revision <= runtime.revision ) {
		return {
			status : 'up-to-date' ,
			bundledRevision ,
			cacheRevision ,
			remoteRevision : remote.revision ,
			remote ,
			runtime,
		};
	}
	return {
		status : 'available' ,
		bundledRevision ,
		cacheRevision ,
		remoteRevision : remote.revision ,
		diff : previewCatalogMerge( runtime.ais , remote.ais , ours , deletedIds ) ,
		remote ,
		runtime,
	};
};

/**
 * 验签 + 算出 preview。不改 pending。
 * ours 必须是当前 effective 列表（含已 compose 进来的种子页），不要只用 user.ais。
 */
export const ingestAndEvaluateCatalogUpdate = ( input:{
	json: Buffer;
	sigText: string;
	publicKeyPem: string;
	bundled: AICatalog.Catalog;
	cache: AICatalog.Catalog | null;
	ours: AI.AIItem[];
	deletedIds: string[];
	validateOptions?: AICatalog.ValidateOptions;
} ):EvaluatedUpdate => {
	const bundledRevision = input.bundled.revision;
	const cacheRevision = input.cache ? input.cache.revision : null;
	const ingested = ingestSignedCatalog(
		input.json ,
		input.sigText ,
		input.publicKeyPem ,
		input.validateOptions ?? { production : true },
	);
	if( !ingested.ok ) {
		return {
			status : 'error' ,
			bundledRevision ,
			cacheRevision ,
			errorCode : ingested.errorCode,
		};
	}
	return evaluateCatalogUpdate(
		input.bundled ,
		input.cache ,
		input.ours ,
		input.deletedIds ,
		ingested.catalog ,
	);
};

type CatalogUpdateCheckInput = {
	bundled: AICatalog.Catalog;
	cache: AICatalog.Catalog | null;
	ours: AI.AIItem[];
	deletedIds: string[];
	publicKeyPem: string;
	json: Buffer;
	sigText: string;
	validateOptions?: AICatalog.ValidateOptions;
};

type CatalogUpdateApplyInput = {
	bundled: AICatalog.Catalog;
	cache: AICatalog.Catalog | null;
	ours: AI.AIItem[];
	deletedIds: string[];
	expectedRevision: number;
};

/**
 * 一次检查/确认会话。pending 在实例上，不是模块全局。
 * 失败的 check 不清上一份成功 pending；apply 先 peek，调用方写盘成功后再 commit。
 * 重叠的 check 用序号：只有最新一次能改 pending。
 */
export const createCatalogUpdateCycle = () => {
	let seq = 0;
	let pending:{
		checkId: number;
		catalog: AICatalog.Catalog;
	} | null = null;

	const isCurrent = ( checkId:number ) => checkId === seq;

	const beginCheck = ():number => {
		seq += 1;
		return seq;
	};

	const checkFromBytes = (
		input:CatalogUpdateCheckInput ,
		checkId?:number ,
	):AICatalog.CatalogUpdateCheckResult => {
		const id = checkId ?? beginCheck();
		const evaluated = ingestAndEvaluateCatalogUpdate( input );
		if( evaluated.status === 'available' && evaluated.remote && isCurrent( id ) ) {
			pending = {
				checkId : id ,
				catalog : evaluated.remote,
			};
		} else if( evaluated.status === 'up-to-date' && isCurrent( id ) ) {
			pending = null;
		}
		const ipc = toIpcCatalogCheckResult( evaluated );
		// available 只在这次 check 写下 pending 之后才回给 UI，否则 Modal 确认会 no-pending
		if( ipc.status === 'available' && !isCurrent( id ) ) {
			return {
				...ipc ,
				status : 'error' ,
				errorCode : 'no-pending' ,
				diff : undefined,
			};
		}
		return ipc;
	};

	return {
		/** 开始一次 check。更早的 inflight check 之后 remember 会被丢掉。 */
		beginCheck ,
		checkFromBytes ,
		/**
		 * 算出可写盘的 user 表，不消耗 pending。
		 * 写盘成功后调 commit(revision)。
		 */
		previewApply( input:CatalogUpdateApplyInput ):{
			ok: true;
			catalog: AICatalog.Catalog;
			user: AICatalog.UserAIs;
		} | {
			ok: false;
			errorCode: 'no-pending';
		} {
			if( !pending || pending.catalog.revision !== input.expectedRevision ) {
				return { ok : false , errorCode : 'no-pending' };
			}
			const remote = pending.catalog;
			const runtime = selectRuntimeCatalog( input.bundled , input.cache );
			return {
				ok : true ,
				catalog : remote ,
				user : applyCatalogMerge( runtime.ais , remote.ais , input.ours , input.deletedIds ),
			};
		} ,
		commit( revision:number ):void {
			if( pending && pending.catalog.revision === revision ) {
				pending = null;
			}
		} ,
		/** 测试用：当前 pending 的 revision。 */
		pendingRevision():number | null {
			return pending?.catalog.revision ?? null;
		},
	};
};

import {
	isAllowedAiCatalogDownloadUrl ,
	decodeCatalogSignature ,
	verifyCatalogSignature,
} from './ai-catalog-sign.utility';
import {
	applyCatalogMerge ,
	previewCatalogMerge ,
	selectRuntimeCatalog,
} from './ai-catalog-merge.utility';
import { diffVendorAvailability } from './ai-catalog-region.utility';
import {
	CATALOG_MAX_BYTES ,
	KNOWN_CATALOG_SCHEMA_VERSION ,
	peekCatalogSchemaVersion ,
	validateCatalog,
} from './ai-catalog-validate.utility';
import type { AICatalog } from '#src/Types/AICatalog';
import type { AI } from '#src/Types/SettingsTypes/AI';
