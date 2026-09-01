/**
 * 批次 5 主进程编排：拉 ChatAIO-Releases tag `ai-catalog` 的 JSON+sig，
 * 交给 AIConfigService 验签 / pending / 写盘。启动不走这里。
 * 本地预览用 CHATAIO_CATALOG_REMOTE_JSON / _SIG 读已签名文件，不再伪装成 GitHub URL。
 * 见 docs/features/ai-catalog-manual-update.md。
 */

const FETCH_HEADERS = {
	Accept : 'application/octet-stream' ,
	'User-Agent' : 'ChatAIO',
};

/** Electron net.fetch：跟 GitHub Release 302 到 objects.githubusercontent.com。 */
export const fetchCatalogBytesViaNet = async( url:string ):Promise<Buffer> => {
	const controller = new AbortController();
	const timer = setTimeout( () => controller.abort() , CATALOG_UPDATE_FETCH_TIMEOUT_MS );
	try {
		const response = await net.fetch( url , {
			method : 'GET' ,
			headers : FETCH_HEADERS ,
			signal : controller.signal,
		} );
		if( !response.ok ) {
			throw new Error( `HTTP ${ response.status }` );
		}
		return Buffer.from( await response.arrayBuffer() );
	} finally {
		clearTimeout( timer );
	}
};

/** 读安装包公钥。缺文件让 ingest 报 verify-failed。 */
const readBundledPublicKeyPem = ():string => {
	return fs.readFileSync( resolveBundledCatalogPublicKeyPath() , 'utf-8' );
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
	return fetchSignedCatalogPair(
		AI_CATALOG_REMOTE_JSON_URL ,
		AI_CATALOG_REMOTE_SIG_URL ,
		fetchCatalogBytesViaNet ,
	);
};

/** 同一时刻只跑一条 check/apply，避免慢的旧请求盖掉新结果或 apply 踩正在 ingest 的 pending。 */
let catalogUpdateChain:Promise<unknown> = Promise.resolve();

const enqueueCatalogUpdate = <T>( run:() => Promise<T> ):Promise<T> => {
	const next = catalogUpdateChain.then( run , run );
	catalogUpdateChain = next.then( () => undefined , () => undefined );
	return next;
};

/** IPC `check-ai-catalog-update`：只读，不写盘。fetch 前占一个 checkId。 */
export const checkAiCatalogUpdate = ():Promise<AICatalog.CatalogUpdateCheckResult> => {
	return enqueueCatalogUpdate( async() => {
		const aiConfig = getAIConfigService();
		const checkId = aiConfig.beginCatalogCheck();
		const pair = await loadRemoteCatalogBytes();
		if( !pair.ok ) {
			return emptyCheckError( pair.errorCode , aiConfig );
		}
		return aiConfig.checkSignedCatalog( pair.json , pair.sigText , readBundledPublicKeyPem() , checkId );
	} );
};

/**
 * IPC `apply-ai-catalog-update`。
 * revision 必须等于这次 check 留下的 pending；写盘成功才 sync views。
 */
export const applyAiCatalogUpdate = (
	revision:number ,
):Promise<AICatalog.CatalogUpdateApplyResult> => {
	return enqueueCatalogUpdate( async() => {
		return getAIConfigService().applySignedCatalog( revision );
	} );
};

import {
	CATALOG_UPDATE_FETCH_TIMEOUT_MS ,
	fetchSignedCatalogPair,
} from './ai-catalog-update.utility';
import { resolveBundledCatalogPublicKeyPath } from './ai-catalog-path.utility';
import { getAIConfigService } from '../ai-config-service';
import {
	AI_CATALOG_REMOTE_JSON_URL ,
	AI_CATALOG_REMOTE_SIG_URL,
} from './ai-catalog-sign.utility';
import type { AICatalog } from '#src/Types/AICatalog';
import * as fs from 'node:fs';
import { net } from 'electron';
