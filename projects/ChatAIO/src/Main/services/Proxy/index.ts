/**
 * Proxy Service - re-exports from settings/proxy-service
 * 代理解析和应用逻辑的入口
 */
export {
	resolveGlobalProxy ,
	resolveAIProxy ,
	applyResolvedProxyToSession ,
	applyAIProxyToView,
} from '#main/services/settings/proxy-service';
export type { ResolvedProxy } from '#main/services/settings/proxy-service';
