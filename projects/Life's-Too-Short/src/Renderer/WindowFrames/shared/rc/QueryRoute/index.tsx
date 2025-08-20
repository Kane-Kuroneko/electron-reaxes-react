/**
 * 根据 URL 查询参数（query string）条件渲染组件或 element。
 * 当指定的 queryKey 对应的值等于 queryValue 时，会渲染 element 或 Component，否则不渲染任何内容。
 *
 * 特性：
 * 1. **仅匹配查询参数**，忽略 path。
 * 2. 支持 `element` 或 `Component` 并行，二选一，风格与 React Router 的 `<Route>` 一致。
 * 3. 可直接放在任意组件内使用，无需 `<Routes>` 包裹。
 *
 * 参数：
 * @param {string} queryKey - URL 查询参数的键名，用于匹配。
 * @param {string} queryValue - 期望的值，当 URL 中对应 queryKey 的值等于它时渲染组件。
 * @param {React.ReactNode} [element] - 要渲染的 React 节点，如果指定了 element，则优先使用。
 * @param {React.ComponentType<any>} [Component] - 要渲染的 React 组件，如果没有 element，则使用 Component。
 *
 * 使用示例：
 * ```tsx
 * // 使用 element
 * <QueryRoute queryKey="settings" queryValue="1" element={<Settings />} />
 *
 * // 使用 Component
 * <QueryRoute queryKey="edit" queryValue="true" Component={EditChat} />
 *
 * // URL: /chat/123?settings=1
 * // 当 URL 查询参数 settings=1 时，显示 Settings 弹窗，否则不渲染。
 * ```
 */
export const QueryRoute: React.FC<QueryRouteProps> = ({ queryKey, queryValue, element, Component }) => {
	const location = useLocation();
	const params = new URLSearchParams(location.search);
	try {
		const value = params.get(queryKey);
		var parsed = value.split( ',' );
		
	}catch {}
	const match = shallowEqual(parsed,queryValue);
	
	if (!match) return null;
	
	return element ?? (Component ? <Component /> : null);
};
interface QueryRouteProps {
	queryKey: string;
	queryValue: any;
	element?: React.ReactNode;
	Component?: React.ComponentType<any>;
}
import React from 'react';
import { useLocation } from 'react-router-dom';
import { shallowEqual } from "reaxes-utils";
