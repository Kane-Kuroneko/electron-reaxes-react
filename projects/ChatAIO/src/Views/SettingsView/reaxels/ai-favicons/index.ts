/**
 * @description Settings 端 custom 页 favicon 表（aiId → data URL）
 *
 * 主进程 `ai-favicon` 服务负责抓取与缓存；这里只是渲染端的一次性拉取 + 内存镜像，
 * 供 Manage AIs 表 / 弹窗 / 代理 bypass 树里的 `AIVendorLogo` 兜底。内置 family 不在表里。
 * 打开 Manage AIs 时调一次 `ensureLoaded()`，重复调用无副作用。
 * 设计文档：docs/features/ai-vendor-logo-identity.md
 */
export const reaxel_AIFavicons = reaxel( () => {
	const { store , setState , mutate } = createReaxable( {
		byId : {} as Record<string , string> ,
		loaded : false ,
	} );

	let inflight:Promise<void> | null = null;

	const ensureLoaded = ( force = false ) => {
		if( inflight ) {
			return inflight;
		}
		if( store.loaded && !force ) {
			return Promise.resolve();
		}
		inflight = ( async() => {
			try {
				const byId = await getAIFavicons();
				setState( {
					byId : byId && typeof byId === 'object' ? byId : {} ,
					loaded : true,
				} );
			} catch ( error ) {
				console.warn( '[ai-favicons] load failed:' , error );
				setState( { loaded : true } );
			} finally {
				inflight = null;
			}
		} )();
		return inflight;
	};

	const getFavicon = ( aiId:string ):string | null => store.byId[aiId] ?? null;

	const rtn = {
		ensureLoaded ,
		getFavicon,
	};

	return Object.assign( () => rtn , {
		store ,
		setState ,
		mutate,
	} );
} );

import { getAIFavicons } from '#SettingsView/services/Settings';
import { createReaxable , reaxel } from 'reaxes';
