/**
 * 批次 5 主进程编排：拉 ChatAIO-Releases tag `ai-catalog` 的 JSON+sig，
 * 交给 AIConfigService 验签 / pending / 写盘。启动不走这里。
 * 本地预览用 CHATAIO_CATALOG_REMOTE_JSON / _SIG 读已签名文件，不再伪装成 GitHub URL。
 * GitHub 下载走 App 全局代理，边下边限体积。
 *
 * 禁止 await 内存 partition 的 clearCache/clearStorageData：historically 永不 resolve
 *（electron#16141），会卡住 IPC，Settings `checking` 清不掉，侧栏/页脚锁死。
 * 见 docs/features/ai-catalog-manual-update.md
 */

const FETCH_HEADERS = {
	Accept : 'application/octet-stream' ,
	'User-Agent' : 'ChatAIO',
};

const CATALOG_SIG_MAX_BYTES = 16 * 1024;
/** 复用同一内存 partition，不要每次 unique name，也不要 close/clear。 */
const CATALOG_FETCH_PARTITION = 'ai-catalog-fetch';

type CatalogProxyLoginDisposer = () => void;

/**
 * 跟 Settings 全局代理同一套解析。
 * 见 proxy-service：direct 不显式 setProxy，沿用 Chromium 默认。
 * 不匹配的 proxy login 必须 callback() 取消，否则 session.fetch 会一直挂。
 */
const attachCatalogProxyLogin = (
	resolvedProxy:ReturnType<typeof resolveGlobalProxy>,
):CatalogProxyLoginDisposer => {
	if( !resolvedProxy.proxyAuth ) {
		return () => {};
	}
	const proxyAuth = resolvedProxy.proxyAuth;
	const proxyHost = ( resolvedProxy.proxyRules || '' ).match( /:\/\/([^/:]+)/ )?.[1] || '';
	const loginHandler = (
		event:any ,
		_webContents:any ,
		_details:any ,
		authInfo:any ,
		callback:( username?:string , password?:string ) => void,
	) => {
		if( !authInfo?.isProxy ) {
			return;
		}
		event.preventDefault();
		if( proxyHost && authInfo.host && authInfo.host !== proxyHost ) {
			callback();
			return;
		}
		callback( proxyAuth.username , proxyAuth.password );
	};
	app.on( 'login' , loginHandler );
	return () => {
		app.removeListener( 'login' , loginHandler );
	};
};

const fetchOnCatalogSession = async(
	ses:Session ,
	url:string ,
	maxBytes:number,
):Promise<Buffer> => {
	const controller = new AbortController();
	const work = ( async() => {
		const response = await ses.fetch( url , {
			method : 'GET' ,
			headers : FETCH_HEADERS ,
			signal : controller.signal,
		} );
		if( !response.ok ) {
			throw new Error( `HTTP ${ response.status }` );
		}
		return await readCappedFetchBody( response , maxBytes , controller );
	} )();
	try {
		return await rejectWhenTimedOut(
			work ,
			CATALOG_UPDATE_FETCH_TIMEOUT_MS ,
			'catalog fetch timeout',
		);
	} finally {
		controller.abort();
	}
};

/**
 * 单 URL 下载。partition 按名字复用。
 * 禁止在这里 await clearCache / clearStorageData。
 */
export const fetchCatalogBytesViaNet = async(
	url:string ,
	maxBytes:number = CATALOG_MAX_BYTES,
):Promise<Buffer> => {
	const ses = session.fromPartition( CATALOG_FETCH_PARTITION );
	const settings = getSettingsConfigService().getEffectiveSettings();
	const resolvedProxy = resolveGlobalProxy( settings );
	const detachLogin = attachCatalogProxyLogin( resolvedProxy );
	try {
		await applyResolvedProxyToSession( ses , resolvedProxy );
		return await fetchOnCatalogSession( ses , url , maxBytes );
	} finally {
		detachLogin();
	}
};

const readCappedFetchBody = async(
	response:Response ,
	maxBytes:number ,
	controller:AbortController,
):Promise<Buffer> => {
	const contentLength = Number( response.headers.get( 'content-length' ) || 0 );
	if( contentLength > maxBytes ) {
		controller.abort();
		throw catalogBytesTooLargeError();
	}
	const body = response.body;
	if( body && typeof body.getReader === 'function' ) {
		const reader = body.getReader();
		const chunks:Uint8Array[] = [];
		let total = 0;
		try {
			while( true ) {
				const { done , value } = await reader.read();
				if( done ) {
					break;
				}
				if( !value ) {
					continue;
				}
				total += value.byteLength;
				if( total > maxBytes ) {
					controller.abort();
					throw catalogBytesTooLargeError();
				}
				chunks.push( value );
			}
		} finally {
			void reader.cancel().catch( () => {
				/* 已 abort / 读完；不要 await，cancel 卡住不能挡住超时 */
			} );
		}
		return Buffer.concat( chunks.map( chunk => Buffer.from( chunk ) ) );
	}
	const bytes = Buffer.from( await response.arrayBuffer() );
	if( bytes.length > maxBytes ) {
		throw catalogBytesTooLargeError();
	}
	return bytes;
};

/** 读安装包公钥。ENOENT / 空 PEM 返回空串，ingest 报 verify-failed，不当 network。 */
const readBundledPublicKeyPem = ():string => {
	return readPublicKeyPemSafe( () => fs.readFileSync( resolveBundledCatalogPublicKeyPath() , 'utf-8' ) );
};

const emptyCheckError = (
	errorCode:AICatalog.CatalogUpdateErrorCode ,
	aiConfig:ReturnType<typeof getAIConfigService> ,
):AICatalog.CatalogUpdateCheckResult => {
	return {
		status : 'error' ,
		bundledRevision : aiConfig.getBundledCatalog().revision ,
		cacheRevision : aiConfig.getCachedCatalog()?.revision ?? null ,
		errorCode,
	};
};

/**
 * 远程字节：默认 GitHub Release；两个 env 都指向本地已签名文件时直接读盘。
 * 本地路径不走 URL 白名单（维护者预览，不是用户功能）。
 */
const loadRemoteCatalogBytes = async():Promise<
	| { ok: true; json: Buffer; sigText: string }
	| { ok: false; errorCode: Extract<AICatalog.CatalogUpdateErrorCode , 'network' | 'forbidden-url' | 'invalid-catalog'> }
> => {
	const jsonPath = process.env.CHATAIO_CATALOG_REMOTE_JSON;
	const sigPath = process.env.CHATAIO_CATALOG_REMOTE_SIG;
	if( jsonPath && sigPath && fs.existsSync( jsonPath ) && fs.existsSync( sigPath ) ) {
		return {
			ok : true ,
			json : fs.readFileSync( jsonPath ) ,
			sigText : fs.readFileSync( sigPath , 'utf-8' ),
		};
	}
	const ses = session.fromPartition( CATALOG_FETCH_PARTITION );
	const settings = getSettingsConfigService().getEffectiveSettings();
	const resolvedProxy = resolveGlobalProxy( settings );
	const detachLogin = attachCatalogProxyLogin( resolvedProxy );
	try {
		await applyResolvedProxyToSession( ses , resolvedProxy );
		return await fetchSignedCatalogPair(
			AI_CATALOG_REMOTE_JSON_URL ,
			AI_CATALOG_REMOTE_SIG_URL ,
			async( url ) => {
				const maxBytes = url.endsWith( '.sig' ) ? CATALOG_SIG_MAX_BYTES : CATALOG_MAX_BYTES;
				return fetchOnCatalogSession( ses , url , maxBytes );
			},
		);
	} finally {
		detachLogin();
	}
};

/** 同一时刻只跑一条 check/apply/discard，避免慢的旧请求盖掉新结果或 apply 踩正在 ingest 的 pending。 */
let catalogUpdateChain:Promise<unknown> = Promise.resolve();

const enqueueCatalogUpdate = <T>( run:() => Promise<T> ):Promise<T> => {
	const next = catalogUpdateChain.then( run , run );
	catalogUpdateChain = next.then( () => undefined , () => undefined );
	return next;
};

/**
 * IPC `check-ai-catalog-update`：只读，不写盘。fetch 前占一个 checkId。
 * 整次 check 有硬超时：队列不能被一次挂死的 fetch/session 清理堵死。
 * UI 连点的 in-flight 锁在 `reaxel_SettingsView.catalog_update`：
 * store busy 时不要再调本函数，否则第一次成功后第二次会 no-pending。
 */
export const checkAiCatalogUpdate = ():Promise<AICatalog.CatalogUpdateCheckResult> => {
	return enqueueCatalogUpdate( async() => {
		const aiConfig = getAIConfigService();
		return raceWithTimeout(
			( async() => {
				const checkId = aiConfig.forRuntimeBeginCatalogCheck();
				const pair = await loadRemoteCatalogBytes();
				if( pair.ok === false ) { /* 必须 === false，见 CODING_STANDARD.md 判别联合 */
					return emptyCheckError( pair.errorCode , aiConfig );
				}
				return aiConfig.forRuntimeCheckSignedCatalog( pair.json , pair.sigText , readBundledPublicKeyPem() , checkId );
			} )() ,
			CATALOG_UPDATE_OPERATION_TIMEOUT_MS ,
			() => emptyCheckError( 'network' , aiConfig ),
		);
	} );
};

/**
 * IPC `apply-ai-catalog-update`。
 * revision 必须等于这次 check 留下的 pending；写盘成功才 sync views。
 * UI 应在 store busy 时不调用；队列里第二次 apply 在第一次 commit 后是 no-pending。
 */
export const applyAiCatalogUpdate = (
	revision:number ,
):Promise<AICatalog.CatalogUpdateApplyResult> => {
	return enqueueCatalogUpdate( async() => {
		return getAIConfigService().forRuntimeApplySignedCatalog( revision );
	} );
};

/** IPC `discard-ai-catalog-update`：取消预览时丢掉 pending。 */
export const discardAiCatalogUpdate = ():Promise<void> => {
	return enqueueCatalogUpdate( async() => {
		getAIConfigService().forRuntimeDiscardCatalogUpdate();
	} );
};

import { catalogBytesTooLargeError , fetchSignedCatalogPair , readPublicKeyPemSafe } from './ai-catalog-update.utility';
import { CATALOG_MAX_BYTES } from './ai-catalog-validate.utility';
import { resolveBundledCatalogPublicKeyPath } from './ai-catalog-path.utility';
import { getAIConfigService } from '../ai-config-service';
import { getSettingsConfigService } from '../settings-config-service';
import {
	applyResolvedProxyToSession ,
	resolveGlobalProxy,
} from '../proxy-service';
import {
	AI_CATALOG_REMOTE_JSON_URL ,
	AI_CATALOG_REMOTE_SIG_URL,
} from './ai-catalog-sign.utility';
import {
	CATALOG_UPDATE_FETCH_TIMEOUT_MS ,
	CATALOG_UPDATE_OPERATION_TIMEOUT_MS ,
	raceWithTimeout ,
	rejectWhenTimedOut,
} from '#shared/utils/catalog-update-timeout.utility';
import type { AICatalog } from '#src/Types/AICatalog';
import * as fs from 'node:fs';
import {
	app ,
	session ,
	type Session,
} from 'electron';
