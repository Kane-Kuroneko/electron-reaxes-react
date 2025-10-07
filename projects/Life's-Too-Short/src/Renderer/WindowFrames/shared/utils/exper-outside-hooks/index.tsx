import { useNavigate } from "react-router-dom";

/**
 * @description
 * Create a mechanism to use React hooks outside of React components.
 * This utility allows you to "steal" the return value of a hook and use it in non-component contexts.
 * It works by storing the hook's return value in a reaxable state, which can then be accessed via a function call.
 * @example
 * const {stealthCall,useStealthHook} = createHookStealer(() => {
 *    const nav = useNavigate();
 *    return nav;
 * });
 * //in component
 * useStealthHook();
 * //outside component
 * const nav = stealthCall(fn => fn());
 * nav('/chat');
 */
export const createHookStealer = <
	Props,
	HookFn extends (props: Props) => any,
	Rtn = ReturnType<HookFn>
>(hook: HookFn) => {
	const { store, setState } = createReaxable({
		internal: null as <T>(fn: (hookRtn: Rtn) => T) => T,
	});
	
	return {
		stealthCall<T>(fn: (hookRtn: Rtn) => T): T | undefined {
			return store.internal?.(fn);
		},
		useStealthHook(props?: Props):Rtn {
			const rtn = hook(props);
			setState({
				internal: (fn) => fn(rtn),
			});
			return rtn;
		},
	};
};

