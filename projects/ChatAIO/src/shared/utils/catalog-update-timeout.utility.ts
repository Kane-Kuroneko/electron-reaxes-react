/**
 * 目录检查可能永不 settle（内存 session 的 clearCache、session.fetch abort 无效）。
 * 硬超时让 IPC / UI 一定结束，避免 checking 卡死侧栏。
 * 见 docs/features/ai-catalog-manual-update.md
 */

/** 单次 GitHub 下载（JSON 或 sig）。abort 不生效时靠这项兜底。 */
export const CATALOG_UPDATE_FETCH_TIMEOUT_MS = 20_000;

/** 整次 check（两次下载 + 验签）。必须短于 UI watchdog，好让主进程先返回。 */
export const CATALOG_UPDATE_OPERATION_TIMEOUT_MS = 25_000;

/** Renderer 最后一道闸：主进程若仍挂住，到期后清 checking。 */
export const CATALOG_UPDATE_UI_WATCHDOG_MS = 30_000;

/**
 * @description 给可能永不 settle 的 Promise 加硬超时。超时后原 Promise 继续跑，迟到的 reject 必须吞掉。
 * @param {Promise<T>} promise 实际工作
 * @param {number} timeoutMs 超时毫秒
 * @param {() => T} onTimeout 超时回调；抛错则整次 race 拒绝
 * @return {Promise<T>}
 */
export const raceWithTimeout = async <T>(
	promise:Promise<T> ,
	timeoutMs:number ,
	onTimeout:() => T,
):Promise<T> => {
	let finished = false;
	let timer:ReturnType<typeof setTimeout> | undefined;
	const wrapped = promise.then(
		( value ) => {
			finished = true;
			return value;
		} ,
		( error ) => {
			if( finished ) {
				console.error( '[CatalogUpdate] ignored late rejection after timeout:' , error );
				return undefined as T;
			}
			finished = true;
			throw error;
		},
	);
	const timeoutPromise = new Promise<T>( ( resolve , reject ) => {
		timer = setTimeout( () => {
			if( finished ) {
				return;
			}
			finished = true;
			try {
				resolve( onTimeout() );
			} catch ( error ) {
				reject( error );
			}
		} , timeoutMs );
	} );
	try {
		return await Promise.race( [ wrapped , timeoutPromise ] );
	} finally {
		if( timer !== undefined ) {
			clearTimeout( timer );
		}
	}
};

/**
 * @description 超时则以 Error 拒绝。用于 fetch：让 fetchSignedCatalogPair 收成 network。
 */
export const rejectWhenTimedOut = <T>(
	promise:Promise<T> ,
	timeoutMs:number ,
	message:string,
):Promise<T> => {
	return raceWithTimeout( promise , timeoutMs , () => {
		throw new Error( message );
	} );
};
