import { NavigateFunction  } from "react-router-dom";

/**
 * @description
 * Create a tunnel to use React hooks inside non-component contexts.
 * This utility allows you to "steal" a function that uses hooks and call it outside of React components.
 * It works by storing the function in a reaxable state, which can then be accessed via a function call.
 * @example
 * const {stealthCall,StealthHookComponent} = createHooksTunnel<(navigate:NavigateFunction) => void>();
 * //in component
 * <StealthHookComponent>{ (navigate) => {
 *    //use navigate here
 * }}</StealthHookComponent>
 * //outside component
 * stealthCall((navigate) => {
 *    navigate('/chat');
 * });
 * 
 */
export const createHooksTunnel = <T extends (...args:any[]) => any>() => {
	
	const {store,setState} = createReaxable({
		internal : null as T,
	})
	
	return {
		stealthCall(fn:T){
			setState({internal : fn});
		},
		StealthHookComponent : reaxper((props:{children:(fn:T) => void}) => {
			const rtn = props.children(store.internal);
			return null;
		})
	}
}
