/**
 * @description custom AI 页 favicon 缓存（供应商 logo 的兜底来源）
 *
 * 内置 family 一律用打包的 lobe-icons SVG（见 `#shared/ai-vendor-logo`），本服务只对
 * **没有打包 logo** 的 family（custom / dev-proxy-test / 未来新增未同步的 family）生效：
 *
 * 1. `trackAIViewFavicon(view, ai)`：AI WCV 创建时挂 `page-favicon-updated`；
 * 2. 用该 view 自己的 `session.fetch` 下载（代理与页面一致，不走默认 session）；
 * 3. 限 128KB，转 data URL，内存 Map + `userData/ai-favicons.json` 持久化；
 * 4. 变化时通知订阅者（runtime 里接 `reaxel_Menu().scheduleMenuUpdate()`），Settings / Guiding
 *    通过 RPC `get-ai-favicons` 拉全表。
 *
 * 缓存 key 是 `AIItem.id`（页实例），因为两个 custom 页可能指向不同站点。
 * 设计文档：docs/features/ai-vendor-logo-identity.md
 */

const FAVICON_CACHE_FILE = 'ai-favicons.json';
const MAX_FAVICON_BYTES = 128 * 1024;
const FETCH_TIMEOUT_MS = 8000;

type FaviconEntry = {
	/** 站点上报的 favicon 原始 URL，用于去重 */
	sourceUrl:string;
	dataUrl:string;
	updatedAt:number;
};

type FaviconCache = Record<string , FaviconEntry>;

let memoryCache:FaviconCache | null = null;
let writeTimer:NodeJS.Timeout | null = null;
const listeners = new Set<( aiId:string ) => void>();
/** 正在下载中的 aiId → sourceUrl，避免同一 favicon 并发重复抓 */
const inflight = new Map<string , string>();

const cachePath = () => path.join( app.getPath( 'userData' ) , FAVICON_CACHE_FILE );

/** 懒加载磁盘缓存；文件损坏视为空表（运行时校验，不信任磁盘内容）。 */
const loadCache = ():FaviconCache => {
	if( memoryCache ) {
		return memoryCache;
	}
	memoryCache = {};
	try {
		const raw = fs.readFileSync( cachePath() , 'utf-8' );
		const parsed = JSON.parse( raw );
		if( parsed && typeof parsed === 'object' ) {
			for( const [ id , entry ] of Object.entries( parsed as Record<string , unknown> ) ) {
				if( isFaviconEntry( entry ) ) {
					memoryCache[id] = entry;
				}
			}
		}
	} catch {
		/* 首次运行 / 文件缺失 / JSON 损坏都当空表 */
	}
	return memoryCache;
};

const isFaviconEntry = ( value:unknown ):value is FaviconEntry => {
	if( !value || typeof value !== 'object' ) {
		return false;
	}
	const entry = value as Partial<FaviconEntry>;
	return typeof entry.sourceUrl === 'string'
		&& typeof entry.dataUrl === 'string'
		&& entry.dataUrl.startsWith( 'data:image/' )
		&& entry.dataUrl.length <= MAX_FAVICON_BYTES * 2
		&& typeof entry.updatedAt === 'number';
};

const scheduleWrite = () => {
	if( writeTimer ) {
		return;
	}
	writeTimer = setTimeout( () => {
		writeTimer = null;
		const cache = loadCache();
		fs.promises.writeFile( cachePath() , JSON.stringify( cache , null , '\t' ) , 'utf-8' )
			.catch( error => console.warn( '[ai-favicon] write cache failed:' , error ) );
	} , 500 );
};

/** 单页 favicon 的 data URL；无缓存返回 null。 */
export const getAIFaviconDataUrl = ( aiId:string ):string | null => {
	return loadCache()[aiId]?.dataUrl ?? null;
};

/** 全表：aiId → data URL。渲染端 Settings / Guiding 一次拉取。 */
export const getAllAIFavicons = ():Record<string , string> => {
	const cache = loadCache();
	const result:Record<string , string> = {};
	for( const [ id , entry ] of Object.entries( cache ) ) {
		result[id] = entry.dataUrl;
	}
	return result;
};

export const onAIFaviconChange = ( listener:( aiId:string ) => void ) => {
	listeners.add( listener );
	return () => {
		listeners.delete( listener );
	};
};

/** 页实例删除时顺手清缓存（可选调用，不清也只是多一条无主记录）。 */
export const forgetAIFavicon = ( aiId:string ) => {
	const cache = loadCache();
	if( cache[aiId] ) {
		delete cache[aiId];
		scheduleWrite();
	}
};

/**
 * 在 AI WCV 上挂 favicon 追踪。内置 family 直接跳过（有打包 logo，不需要 favicon）。
 * 站点每次导航都可能触发 `page-favicon-updated`，用 sourceUrl 去重避免重复下载。
 */
export const trackAIViewFavicon = ( view:WebContentsView , ai:AI.AIItem ) => {
	if( hasBundledVendorLogo( ai.AI_family ) ) {
		return;
	}
	view.webContents.on( 'page-favicon-updated' , ( _event , favicons ) => {
		const candidate = pickFaviconUrl( favicons );
		if( !candidate ) {
			return;
		}
		const cached = loadCache()[ai.id];
		if( cached?.sourceUrl === candidate || inflight.get( ai.id ) === candidate ) {
			return;
		}
		inflight.set( ai.id , candidate );
		void fetchFaviconAsDataUrl( view , candidate )
			.then( dataUrl => {
				if( !dataUrl ) {
					return;
				}
				loadCache()[ai.id] = { sourceUrl : candidate , dataUrl , updatedAt : Date.now() };
				scheduleWrite();
				listeners.forEach( listener => {
					try {
						listener( ai.id );
					} catch ( error ) {
						console.warn( '[ai-favicon] listener failed:' , error );
					}
				} );
			} )
			.finally( () => {
				if( inflight.get( ai.id ) === candidate ) {
					inflight.delete( ai.id );
				}
			} );
	} );
};

/** 优先 http(s)；没有再接受 data:image（站点偶发内联 favicon）。多张时取第一张合格的。 */
const pickFaviconUrl = ( favicons:string[] ) => {
	let dataUrl:string | null = null;
	for( const url of favicons || [] ) {
		if( /^https?:\/\//i.test( url ) ) {
			return url;
		}
		if( !dataUrl && /^data:image\//i.test( url ) ) {
			dataUrl = url;
		}
	}
	return dataUrl;
};

/** 用该 view 的 session 下载（与页面同代理 / 同 cookie），超大或非图片一律丢弃。data: 直接入库。 */
const fetchFaviconAsDataUrl = async( view:WebContentsView , url:string ):Promise<string | null> => {
	if( /^data:image\//i.test( url ) ) {
		if( url.length > MAX_FAVICON_BYTES * 2 ) {
			return null;
		}
		return url;
	}
	if( view.webContents.isDestroyed() ) {
		return null;
	}
	const controller = new AbortController();
	const timer = setTimeout( () => controller.abort() , FETCH_TIMEOUT_MS );
	try {
		const response = await view.webContents.session.fetch( url , { signal : controller.signal } );
		if( !response.ok ) {
			return null;
		}
		const contentType = ( response.headers.get( 'content-type' ) || '' ).split( ';' )[0].trim().toLowerCase();
		const mime = contentType.startsWith( 'image/' ) ? contentType : guessMimeFromUrl( url );
		if( !mime ) {
			return null;
		}
		const buffer = Buffer.from( await response.arrayBuffer() );
		if( buffer.length === 0 || buffer.length > MAX_FAVICON_BYTES ) {
			return null;
		}
		return `data:${ mime };base64,${ buffer.toString( 'base64' ) }`;
	} catch ( error ) {
		console.warn( '[ai-favicon] fetch failed:' , url , ( error as Error )?.message || error );
		return null;
	} finally {
		clearTimeout( timer );
	}
};

const guessMimeFromUrl = ( url:string ) => {
	const pathname = ( () => {
		try {
			return new URL( url ).pathname.toLowerCase();
		} catch {
			return url.toLowerCase();
		}
	} )();
	if( pathname.endsWith( '.ico' ) ) return 'image/x-icon';
	if( pathname.endsWith( '.png' ) ) return 'image/png';
	if( pathname.endsWith( '.svg' ) ) return 'image/svg+xml';
	if( pathname.endsWith( '.jpg' ) || pathname.endsWith( '.jpeg' ) ) return 'image/jpeg';
	if( pathname.endsWith( '.webp' ) ) return 'image/webp';
	if( pathname.endsWith( '.gif' ) ) return 'image/gif';
	return null;
};

import { hasBundledVendorLogo } from '#shared/ai-vendor-logo/vendor-logo.utility';
import type { AI } from '#src/Types/SettingsTypes/AI';
import { app , type WebContentsView } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
